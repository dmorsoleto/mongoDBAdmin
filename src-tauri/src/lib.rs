mod db;
mod crud;
mod connections;

use db::DbState;
use std::collections::HashMap;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DbState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            db::connect_named,
            db::disconnect_named,
            db::list_databases_for,
            db::list_collections_for,
            crud::find_documents,
            crud::aggregate,
            crud::insert_document,
            crud::update_document,
            crud::delete_document,
            connections::get_saved_connections,
            connections::save_connection,
            connections::delete_connection,
            connections::get_environments,
            connections::save_environment,
            connections::delete_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
