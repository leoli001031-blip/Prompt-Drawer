use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::db::schema::{CREATE_FOLDERS_SQL, CREATE_INDEXES_SQL, CREATE_PROMPT_ASSETS_SQL};
use crate::support::CommandResult;

pub fn database_path(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    Ok(app_dir.join("prompt_workbench.sqlite3"))
}

pub fn open_database(app: &AppHandle) -> CommandResult<Connection> {
    let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

pub fn initialize_database(connection: &Connection) -> CommandResult<()> {
    connection
        .execute_batch(CREATE_FOLDERS_SQL)
        .map_err(|error| error.to_string())?;
    connection
        .execute_batch(CREATE_PROMPT_ASSETS_SQL)
        .map_err(|error| error.to_string())?;
    connection
        .execute_batch(CREATE_INDEXES_SQL)
        .map_err(|error| error.to_string())
}

pub fn validate_folder_type(value: &str) -> CommandResult<()> {
    match value {
        "library" | "project" => Ok(()),
        _ => Err("Invalid folder type".into()),
    }
}
