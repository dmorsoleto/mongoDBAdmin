use bson::{doc, oid::ObjectId, Document};
use mongodb::options::{FindOptions, Hint};
use std::time::Duration;
use serde_json::Value;
use tauri::State;
use futures::TryStreamExt;
use crate::db::DbState;

pub(crate) fn parse_doc(json: &str) -> Result<Document, String> {
    let v: Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    bson::to_document(&v).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn find_documents(
    db: String,
    coll: String,
    filter: Option<String>,
    projection: Option<String>,
    sort: Option<String>,
    collation: Option<String>,
    hint: Option<String>,
    limit: i64,
    skip: u64,
    max_time_ms: Option<u64>,
    state: State<'_, DbState>,
) -> Result<Vec<String>, String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let collection = client.database(&db).collection::<Document>(&coll);

    let filter_doc = match filter.as_deref().map(str::trim).filter(|s| !s.is_empty() && *s != "{}") {
        Some(f) => parse_doc(f)?,
        None => doc! {},
    };

    let projection_doc = projection
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "{}")
        .map(parse_doc)
        .transpose()?;

    let sort_doc = sort
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "{}")
        .map(parse_doc)
        .transpose()?;

    let collation_opt = collation
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "{}")
        .map(|c| serde_json::from_str::<mongodb::options::Collation>(c).map_err(|e| e.to_string()))
        .transpose()?;

    let hint_opt = hint
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|h| -> Result<Hint, String> {
            if h.starts_with('{') {
                let doc = parse_doc(h)?;
                Ok(Hint::Keys(doc))
            } else {
                Ok(Hint::Name(h.trim_matches('"').to_string()))
            }
        })
        .transpose()?;

    let max_time = max_time_ms.map(Duration::from_millis);

    let options = FindOptions::builder()
        .limit(limit)
        .skip(skip)
        .projection(projection_doc)
        .sort(sort_doc)
        .collation(collation_opt)
        .hint(hint_opt)
        .max_time(max_time)
        .build();

    let mut cursor = collection
        .find(filter_doc, options)
        .await
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    while let Some(doc) = cursor.try_next().await.map_err(|e| e.to_string())? {
        let json = serde_json::to_string(&doc).map_err(|e| e.to_string())?;
        results.push(json);
    }
    Ok(results)
}

#[tauri::command]
pub async fn insert_document(
    db: String,
    coll: String,
    doc: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let collection = client.database(&db).collection::<Document>(&coll);
    let v: Value = serde_json::from_str(&doc).map_err(|e| e.to_string())?;
    let bson_doc = bson::to_document(&v).map_err(|e| e.to_string())?;
    let result = collection.insert_one(bson_doc, None).await.map_err(|e| e.to_string())?;
    Ok(result.inserted_id.to_string())
}

#[tauri::command]
pub async fn update_document(
    db: String,
    coll: String,
    id: String,
    doc: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let collection = client.database(&db).collection::<Document>(&coll);
    let oid = ObjectId::parse_str(&id).map_err(|e| e.to_string())?;
    let v: Value = serde_json::from_str(&doc).map_err(|e| e.to_string())?;
    let mut update_doc = bson::to_document(&v).map_err(|e| e.to_string())?;
    update_doc.remove("_id");
    collection
        .update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_document(
    db: String,
    coll: String,
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let client = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let collection = client.database(&db).collection::<Document>(&coll);
    let oid = ObjectId::parse_str(&id).map_err(|e| e.to_string())?;
    collection.delete_one(doc! { "_id": oid }, None).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_doc_simple_object() {
        let doc = parse_doc(r#"{"name": "Alice", "age": 30}"#).unwrap();
        assert_eq!(doc.get_str("name").unwrap(), "Alice");
        // serde_json deserialises integers as i64; bson stores them as Int64
        assert_eq!(doc.get_i64("age").unwrap(), 30);
    }

    #[test]
    fn parse_doc_empty_object() {
        let doc = parse_doc("{}").unwrap();
        assert!(doc.is_empty());
    }

    #[test]
    fn parse_doc_nested_object() {
        let doc = parse_doc(r#"{"user": {"name": "Bob"}}"#).unwrap();
        let nested = doc.get_document("user").unwrap();
        assert_eq!(nested.get_str("name").unwrap(), "Bob");
    }

    #[test]
    fn parse_doc_boolean_field() {
        let doc = parse_doc(r#"{"active": true}"#).unwrap();
        assert_eq!(doc.get_bool("active").unwrap(), true);
    }

    #[test]
    fn parse_doc_null_field() {
        let doc = parse_doc(r#"{"removed": null}"#).unwrap();
        assert!(doc.get("removed").is_some());
    }

    #[test]
    fn parse_doc_array_field() {
        let doc = parse_doc(r#"{"tags": ["rust", "mongo"]}"#).unwrap();
        let arr = doc.get_array("tags").unwrap();
        assert_eq!(arr.len(), 2);
    }

    #[test]
    fn parse_doc_returns_error_for_invalid_json() {
        let result = parse_doc("{ invalid }");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn parse_doc_returns_error_for_non_object_json() {
        // bson::to_document requires a JSON object, not an array
        let result = parse_doc(r#"["a", "b"]"#);
        assert!(result.is_err());
    }

    #[test]
    fn parse_doc_float_field() {
        let doc = parse_doc(r#"{"price": 3.14}"#).unwrap();
        let val = doc.get_f64("price").unwrap();
        assert!((val - 3.14).abs() < 1e-9);
    }

    #[test]
    fn parse_doc_oid_extended_json() {
        // MongoDB extended JSON $oid is handled by bson
        let doc = parse_doc(r#"{"_id": {"$oid": "507f1f77bcf86cd799439011"}}"#).unwrap();
        assert!(doc.get("_id").is_some());
    }
}
