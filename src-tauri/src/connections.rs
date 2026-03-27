use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ── SavedConnection ────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct SavedConnection {
    pub name: String,
    pub uri: String,
    #[serde(default)]
    pub environment: String,
}

fn connections_file(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("connections.json")
}

fn load_connections(app: &AppHandle) -> Vec<SavedConnection> {
    let path = connections_file(app);
    match std::fs::read_to_string(&path) {
        Ok(json) => serde_json::from_str(&json).unwrap_or_default(),
        Err(_) => vec![],
    }
}

fn write_connections(app: &AppHandle, conns: &[SavedConnection]) -> Result<(), String> {
    let path = connections_file(app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(conns).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_saved_connections(app: AppHandle) -> Vec<SavedConnection> {
    load_connections(&app)
}

#[tauri::command]
pub fn save_connection(app: AppHandle, name: String, uri: String, environment: String) -> Result<(), String> {
    let mut conns = load_connections(&app);
    conns.retain(|c| !(c.name == name && c.environment == environment));
    conns.push(SavedConnection { name, uri, environment });
    write_connections(&app, &conns)
}

#[tauri::command]
pub fn delete_connection(app: AppHandle, name: String, environment: String) -> Result<(), String> {
    let mut conns = load_connections(&app);
    conns.retain(|c| !(c.name == name && c.environment == environment));
    write_connections(&app, &conns)
}

// ── Environments ───────────────────────────────────────────────────────────

fn environments_file(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("environments.json")
}

fn load_environments(app: &AppHandle) -> Vec<String> {
    let path = environments_file(app);
    match std::fs::read_to_string(&path) {
        Ok(json) => serde_json::from_str(&json).unwrap_or_default(),
        Err(_) => vec![],
    }
}

fn write_environments(app: &AppHandle, envs: &[String]) -> Result<(), String> {
    let path = environments_file(app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(envs).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_environments(app: AppHandle) -> Vec<String> {
    load_environments(&app)
}

#[tauri::command]
pub fn save_environment(app: AppHandle, name: String) -> Result<(), String> {
    let mut envs = load_environments(&app);
    if !envs.contains(&name) {
        envs.push(name);
        write_environments(&app, &envs)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_environment(app: AppHandle, name: String) -> Result<(), String> {
    let mut envs = load_environments(&app);
    envs.retain(|e| e != &name);
    write_environments(&app, &envs)
}
