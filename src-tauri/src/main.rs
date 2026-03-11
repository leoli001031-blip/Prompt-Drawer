#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

type CommandResult<T> = Result<T, String>;

const CREATE_FOLDERS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('library', 'project')),
    created_at INTEGER NOT NULL
);
"#;

const CREATE_PROMPT_ASSETS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS prompt_assets (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    title TEXT NOT NULL,
    payload TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
"#;

const CREATE_INDEXES_SQL: &str = r#"
CREATE INDEX IF NOT EXISTS idx_prompt_assets_folder_id ON prompt_assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_updated_at ON prompt_assets(updated_at DESC);
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FolderRecord {
    id: String,
    name: String,
    #[serde(rename = "type")]
    folder_type: String,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PromptAssetRow {
    id: String,
    folder_id: String,
    title: String,
    payload: String,
    is_favorite: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkbenchSnapshot {
    folders: Vec<FolderRecord>,
    prompt_assets: Vec<PromptAssetRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StorageDescriptor {
    mode: String,
    path: String,
}

#[derive(Debug, Clone, Deserialize)]
struct CreateFolderInput {
    name: String,
    #[serde(rename = "type")]
    folder_type: String,
}

#[derive(Debug, Clone, Deserialize)]
struct UpdateFolderInput {
    id: String,
    name: String,
    #[serde(rename = "type")]
    folder_type: String,
}

#[derive(Debug, Clone, Deserialize)]
struct CreatePromptAssetInput {
    folder_id: String,
    title: String,
    payload: String,
    is_favorite: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct UpdatePromptAssetInput {
    id: String,
    folder_id: String,
    title: String,
    payload: String,
    is_favorite: bool,
}

fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn make_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().simple())
}

fn bool_to_sql(flag: bool) -> i64 {
    if flag {
        1
    } else {
        0
    }
}

fn database_path(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    Ok(app_dir.join("prompt_workbench.sqlite3"))
}

fn open_database(app: &AppHandle) -> CommandResult<Connection> {
    let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn initialize_database(connection: &Connection) -> CommandResult<()> {
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

fn validate_folder_type(value: &str) -> CommandResult<()> {
    match value {
        "library" | "project" => Ok(()),
        _ => Err("Invalid folder type".into()),
    }
}

fn seed_database(connection: &Connection) -> CommandResult<()> {
    let folder_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM folders", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    if folder_count > 0 {
        return Ok(());
    }

    let created_at = now_ts();
    let library_folder_id = make_id("folder");
    let project_folder_id = make_id("folder");

    connection
        .execute(
            "INSERT INTO folders (id, name, type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![library_folder_id, "角色模板库", "library", created_at],
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO folders (id, name, type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![project_folder_id, "赛博短片项目", "project", created_at + 1],
        )
        .map_err(|error| error.to_string())?;

    let library_payload = json!({
        "blocks": [
            {
                "id": make_id("block"),
                "type": "character",
                "content": "银白短发的东方赛博侦探，黑色长风衣，冷静眼神。",
                "isActive": true
            },
            {
                "id": make_id("block"),
                "type": "style",
                "content": "电影级灯光，雨夜霓虹，写实质感。",
                "isActive": true
            },
            {
                "id": make_id("block"),
                "type": "format",
                "content": "竖版海报构图，8k 细节。",
                "isActive": true
            }
        ],
        "tags": ["角色", "生图", "主角"],
        "export_settings": {
            "separator": "\n",
            "include_labels": true
        }
    })
    .to_string();

    let project_payload = json!({
        "blocks": [
            {
                "id": make_id("block"),
                "type": "camera",
                "content": "低机位广角镜头扫过潮湿街角，远处车辆拖影。",
                "isActive": true
            },
            {
                "id": make_id("block"),
                "type": "style",
                "content": "蓝绿冷色主调，霓虹红色高光。",
                "isActive": true
            },
            {
                "id": make_id("block"),
                "type": "format",
                "content": "16:9，电影感，轻微颗粒。",
                "isActive": true
            }
        ],
        "tags": ["项目", "分镜", "镜头01"],
        "remark": "建立世界观，人物暂不出场。",
        "export_settings": {
            "separator": "\n",
            "include_labels": true
        }
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO prompt_assets (id, folder_id, title, payload, is_favorite, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                make_id("asset"),
                library_folder_id,
                "女主角基础人设",
                library_payload,
                1,
                now_ts()
            ],
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO prompt_assets (id, folder_id, title, payload, is_favorite, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                make_id("asset"),
                project_folder_id,
                "镜头 01 / 雨夜街角建立",
                project_payload,
                0,
                now_ts() + 1
            ],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn query_folders(connection: &Connection) -> CommandResult<Vec<FolderRecord>> {
    let mut statement = connection
        .prepare("SELECT id, name, type, created_at FROM folders ORDER BY created_at ASC")
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(FolderRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_type: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn query_prompt_assets(connection: &Connection, folder_id: Option<String>) -> CommandResult<Vec<PromptAssetRow>> {
    if let Some(value) = folder_id {
        let mut statement = connection
            .prepare(
                "SELECT id, folder_id, title, payload, is_favorite, updated_at
                 FROM prompt_assets
                 WHERE folder_id = ?1
                 ORDER BY updated_at DESC",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map([value], |row| {
                Ok(PromptAssetRow {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: row.get(3)?,
                    is_favorite: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())
    } else {
        let mut statement = connection
            .prepare(
                "SELECT id, folder_id, title, payload, is_favorite, updated_at
                 FROM prompt_assets
                 ORDER BY updated_at DESC",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(PromptAssetRow {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: row.get(3)?,
                    is_favorite: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())
    }
}

fn build_snapshot(connection: &Connection) -> CommandResult<WorkbenchSnapshot> {
    Ok(WorkbenchSnapshot {
        folders: query_folders(connection)?,
        prompt_assets: query_prompt_assets(connection, None)?,
    })
}

#[tauri::command]
fn workbench_schema_sql() -> String {
    format!(
        "{CREATE_FOLDERS_SQL}\n{CREATE_PROMPT_ASSETS_SQL}\n{CREATE_INDEXES_SQL}"
    )
}

#[tauri::command]
fn workbench_storage_descriptor(app: AppHandle) -> CommandResult<StorageDescriptor> {
    Ok(StorageDescriptor {
        mode: "sqlite".into(),
        path: database_path(&app)?.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn workbench_bootstrap(app: AppHandle) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    seed_database(&connection)?;
    build_snapshot(&connection)
}

#[tauri::command]
fn workbench_export_snapshot_json(app: AppHandle) -> CommandResult<String> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    let snapshot = build_snapshot(&connection)?;
    serde_json::to_string_pretty(&snapshot).map_err(|error| error.to_string())
}

#[tauri::command]
fn workbench_list_folders(app: AppHandle) -> CommandResult<Vec<FolderRecord>> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    query_folders(&connection)
}

#[tauri::command]
fn workbench_list_prompt_assets(
    app: AppHandle,
    folder_id: Option<String>,
) -> CommandResult<Vec<PromptAssetRow>> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    query_prompt_assets(&connection, folder_id)
}

#[tauri::command]
fn workbench_create_folder(app: AppHandle, input: CreateFolderInput) -> CommandResult<WorkbenchSnapshot> {
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
fn workbench_update_folder(app: AppHandle, input: UpdateFolderInput) -> CommandResult<WorkbenchSnapshot> {
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
fn workbench_delete_folder(app: AppHandle, folder_id: String) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute("DELETE FROM folders WHERE id = ?1", [folder_id])
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

#[tauri::command]
fn workbench_create_prompt_asset(
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
fn workbench_update_prompt_asset(
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
fn workbench_delete_prompt_asset(app: AppHandle, asset_id: String) -> CommandResult<WorkbenchSnapshot> {
    let connection = open_database(&app)?;
    initialize_database(&connection)?;
    connection
        .execute("DELETE FROM prompt_assets WHERE id = ?1", [asset_id])
        .map_err(|error| error.to_string())?;
    build_snapshot(&connection)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            workbench_schema_sql,
            workbench_storage_descriptor,
            workbench_bootstrap,
            workbench_export_snapshot_json,
            workbench_list_folders,
            workbench_list_prompt_assets,
            workbench_create_folder,
            workbench_update_folder,
            workbench_delete_folder,
            workbench_create_prompt_asset,
            workbench_update_prompt_asset,
            workbench_delete_prompt_asset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
