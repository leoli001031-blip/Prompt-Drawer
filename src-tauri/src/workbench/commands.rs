use rusqlite::params;
use serde_json;
use tauri::AppHandle;

use crate::db::connection::{database_path, initialize_database, open_database, validate_folder_type};
use crate::db::schema::{CREATE_FOLDERS_SQL, CREATE_INDEXES_SQL, CREATE_PROMPT_ASSETS_SQL};
use crate::db::seed::seed_database;
use crate::support::{bool_to_sql, make_id, now_ts, CommandResult};
use crate::types::{
    CreateFolderInput, CreatePromptAssetInput, FolderRecord, PromptAssetRow, StorageDescriptor,
    UpdateFolderInput, UpdatePromptAssetInput, WorkbenchSnapshot,
};
use crate::workbench::queries::{build_snapshot, query_folders, query_prompt_assets};

#[tauri::command]
pub fn workbench_schema_sql() -> String {
    format!(
        "{CREATE_FOLDERS_SQL}\n{CREATE_PROMPT_ASSETS_SQL}\n{CREATE_INDEXES_SQL}"
    )
}

#[tauri::command]
pub fn workbench_storage_descriptor(app: AppHandle) -> CommandResult<StorageDescriptor> {
    Ok(StorageDescriptor {
        mode: "sqlite".into(),
        path: database_path(&app)?.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn workbench_bootstrap(app: AppHandle) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    seed_database(&connection)?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_export_snapshot_json(app: AppHandle) -> CommandResult<String> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    let snapshot = build_snapshot(&connection)?;
    serde_json::to_string_pretty(&snapshot).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn workbench_list_folders(app: AppHandle) -> CommandResult<Vec<FolderRecord>> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    query_folders(&connection)
}

#[tauri::command]
pub fn workbench_list_prompt_assets(
    app: AppHandle,
    folder_id: Option<String>,
) -> CommandResult<Vec<PromptAssetRow>> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    query_prompt_assets(&connection, folder_id)
}

#[tauri::command]
pub fn workbench_create_folder(
    app: AppHandle,
    input: CreateFolderInput,
) -> CommandResult<WorkbenchSnapshot> {
    validate_folder_type(&input.folder_type)?;
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute(
            "INSERT INTO folders (id, name, type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![make_id("folder"), input.name, input.folder_type, now_ts()],
        )
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_update_folder(
    app: AppHandle,
    input: UpdateFolderInput,
) -> CommandResult<WorkbenchSnapshot> {
    validate_folder_type(&input.folder_type)?;
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute(
            "UPDATE folders SET name = ?1, type = ?2 WHERE id = ?3",
            params![input.name, input.folder_type, input.id],
        )
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_delete_folder(
    app: AppHandle,
    folder_id: String,
) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute("DELETE FROM folders WHERE id = ?1", [folder_id])
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_create_prompt_asset(
    app: AppHandle,
    input: CreatePromptAssetInput,
) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute(
            "INSERT INTO prompt_assets (id, folder_id, title, payload, is_favorite, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                make_id("asset"),
                input.folder_id,
                input.title,
                input.payload,
                bool_to_sql(input.is_favorite),
                now_ts()
            ],
        )
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_update_prompt_asset(
    app: AppHandle,
    input: UpdatePromptAssetInput,
) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute(
            "UPDATE prompt_assets
             SET folder_id = ?1, title = ?2, payload = ?3, is_favorite = ?4, updated_at = ?5
             WHERE id = ?6",
            params![
                input.folder_id,
                input.title,
                input.payload,
                bool_to_sql(input.is_favorite),
                now_ts(),
                input.id
            ],
        )
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
pub fn workbench_delete_prompt_asset(
    app: AppHandle,
    asset_id: String,
) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute("DELETE FROM prompt_assets WHERE id = ?1", [asset_id])
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}
