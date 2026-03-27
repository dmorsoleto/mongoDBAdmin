use mongodb::{Client, options::ClientOptions};
use std::sync::Mutex;
use tauri::State;

pub struct DbState(pub Mutex<Option<Client>>);

pub(crate) fn format_error_message(raw: &str) -> String {
    if raw.contains("SCRAM") || raw.contains("Authentication failed") || raw.contains("auth") {
        return format!(
            "Authentication failed. Common causes:\n\
             • Wrong username or password\n\
             • Wrong auth database — add ?authSource=admin (or the db where the user was created)\n\
             • Wrong mechanism — add ?authMechanism=SCRAM-SHA-1 for DocumentDB / older MongoDB\n\
             \nOriginal error: {raw}"
        );
    }
    if raw.contains("wire version") {
        return format!(
            "Server version not supported. This app requires MongoDB 3.6+.\n\nOriginal error: {raw}"
        );
    }
    if raw.contains("timed out") || raw.contains("Connection refused") || raw.contains("No route") {
        return format!(
            "Could not reach the server. Check the host, port, and network/firewall.\n\nOriginal error: {raw}"
        );
    }
    if raw.contains("SSL") || raw.contains("TLS") || raw.contains("certificate") {
        return format!(
            "TLS/SSL error. Try adding ?tls=true or ?tlsInsecure=true to the URI.\n\nOriginal error: {raw}"
        );
    }
    raw.to_string()
}

fn friendly_error(e: mongodb::error::Error) -> String {
    format_error_message(&e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_error_scram() {
        let msg = format_error_message("SCRAM: authentication failed");
        assert!(msg.contains("Authentication failed"), "expected auth message, got: {msg}");
        assert!(msg.contains("Original error:"));
    }

    #[test]
    fn test_auth_error_authentication_failed() {
        let msg = format_error_message("Authentication failed for user admin");
        assert!(msg.contains("Authentication failed"));
    }

    #[test]
    fn test_auth_error_auth_keyword() {
        let msg = format_error_message("bad auth : authentication failed");
        assert!(msg.contains("Authentication failed"));
    }

    #[test]
    fn test_wire_version_error() {
        let msg = format_error_message("Server wire version 4 is not supported");
        assert!(msg.contains("Server version not supported"));
        assert!(msg.contains("MongoDB 3.6+"));
        assert!(msg.contains("Original error:"));
    }

    #[test]
    fn test_connection_timed_out() {
        let msg = format_error_message("connection timed out after 30s");
        assert!(msg.contains("Could not reach the server"));
        assert!(msg.contains("Original error:"));
    }

    #[test]
    fn test_connection_refused() {
        let msg = format_error_message("Connection refused (os error 111)");
        assert!(msg.contains("Could not reach the server"));
    }

    #[test]
    fn test_no_route_to_host() {
        let msg = format_error_message("No route to host");
        assert!(msg.contains("Could not reach the server"));
    }

    #[test]
    fn test_tls_ssl_error() {
        let msg = format_error_message("SSL handshake failed");
        assert!(msg.contains("TLS/SSL error"));
        assert!(msg.contains("Original error:"));
    }

    #[test]
    fn test_tls_keyword() {
        let msg = format_error_message("TLS error: certificate verify failed");
        assert!(msg.contains("TLS/SSL error"));
    }

    #[test]
    fn test_certificate_keyword() {
        let msg = format_error_message("certificate has expired");
        assert!(msg.contains("TLS/SSL error"));
    }

    #[test]
    fn test_unknown_error_returned_verbatim() {
        let raw = "some totally unknown error";
        let msg = format_error_message(raw);
        assert_eq!(msg, raw);
    }

    #[test]
    fn test_empty_error_returned_verbatim() {
        let msg = format_error_message("");
        assert_eq!(msg, "");
    }
}

#[tauri::command]
pub async fn connect(uri: String, state: State<'_, DbState>) -> Result<String, String> {
    let options = ClientOptions::parse(&uri).await.map_err(|e| e.to_string())?;
    let client = Client::with_options(options).map_err(|e| e.to_string())?;
    client.list_database_names(None, None).await.map_err(friendly_error)?;
    *state.0.lock().unwrap() = Some(client);
    Ok("Connected".to_string())
}

#[tauri::command]
pub async fn disconnect(state: State<'_, DbState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn list_databases(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let names = client.list_database_names(None, None).await.map_err(|e| e.to_string())?;
    Ok(names)
}

#[tauri::command]
pub async fn list_collections(db_name: String, state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let db = client.database(&db_name);
    let names = db.list_collection_names(None).await.map_err(|e| e.to_string())?;
    Ok(names)
}
