#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AiProviderProfile {
    id: String,
    name: String,
    kind: String,
    base_url: String,
    api_key: String,
    model: String,
    temperature: f64,
    max_tokens: Option<u32>,
    is_default: bool,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AiSettingsSnapshot {
    default_profile_id: Option<String>,
    profiles: Vec<AiProviderProfile>,
}

#[derive(Debug, Clone, Deserialize)]
struct SaveAiProfileInput {
    id: Option<String>,
    name: String,
    kind: String,
    base_url: String,
    api_key: String,
    model: String,
    temperature: f64,
    max_tokens: Option<u32>,
    is_default: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct AiTaskBlockInput {
    id: String,
    #[serde(rename = "type")]
    block_type: String,
    label: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct AiTaskInput {
    profile_id: String,
    task_type: String,
    folder_type: String,
    asset_title: String,
    tags: Vec<String>,
    blocks: Vec<AiTaskBlockInput>,
    target_block_id: Option<String>,
    user_instruction: Option<String>,
    context_remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AiUsage {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
    total_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AiTaskResult {
    text: String,
    raw_model: Option<String>,
    usage: Option<AiUsage>,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest<'a> {
    model: &'a str,
    temperature: f64,
    max_tokens: Option<u32>,
    messages: Vec<ChatCompletionMessage<'a>>,
}

#[derive(Debug, Serialize)]
struct ChatCompletionMessage<'a> {
    role: &'a str,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    model: Option<String>,
    choices: Vec<ChatCompletionChoice>,
    usage: Option<AiUsage>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoice {
    message: ChatCompletionMessageResponse,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionMessageResponse {
    content: Value,
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

fn ai_settings_path(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    Ok(app_dir.join("ai_profiles.json"))
}

fn normalize_base_url(value: &str) -> String {
    value.trim_end_matches('/').to_string()
}

fn normalize_ai_settings(snapshot: AiSettingsSnapshot) -> AiSettingsSnapshot {
    let explicit_default = snapshot
        .profiles
        .iter()
        .find(|profile| profile.is_default)
        .map(|profile| profile.id.clone())
        .or(snapshot.default_profile_id.clone());

    let default_profile_id = explicit_default
        .filter(|profile_id| snapshot.profiles.iter().any(|profile| &profile.id == profile_id))
        .or_else(|| snapshot.profiles.first().map(|profile| profile.id.clone()));

    AiSettingsSnapshot {
        default_profile_id: default_profile_id.clone(),
        profiles: snapshot
            .profiles
            .into_iter()
            .map(|profile| AiProviderProfile {
                is_default: default_profile_id
                    .as_ref()
                    .map(|profile_id| profile_id == &profile.id)
                    .unwrap_or(false),
                ..profile
            })
            .collect(),
    }
}

fn load_ai_settings(app: &AppHandle) -> CommandResult<AiSettingsSnapshot> {
    let path = ai_settings_path(app)?;
    if !path.exists() {
        return Ok(AiSettingsSnapshot {
            default_profile_id: None,
            profiles: vec![],
        });
    }

    let raw = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let parsed = serde_json::from_str::<AiSettingsSnapshot>(&raw).map_err(|error| error.to_string())?;
    Ok(normalize_ai_settings(parsed))
}

fn write_ai_settings(app: &AppHandle, snapshot: &AiSettingsSnapshot) -> CommandResult<AiSettingsSnapshot> {
    let normalized = normalize_ai_settings(snapshot.clone());
    let raw = serde_json::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    std::fs::write(ai_settings_path(app)?, raw).map_err(|error| error.to_string())?;
    Ok(normalized)
}

fn build_ai_profile(input: SaveAiProfileInput, existing: Option<&AiProviderProfile>) -> AiProviderProfile {
    let created_at = existing.map(|profile| profile.created_at).unwrap_or_else(now_ts);
    AiProviderProfile {
        id: input.id.unwrap_or_else(|| existing.map(|profile| profile.id.clone()).unwrap_or_else(|| make_id("profile"))),
        name: if input.name.trim().is_empty() {
            "未命名模型配置".into()
        } else {
            input.name.trim().into()
        },
        kind: if input.kind.trim().is_empty() {
            "openai_compatible".into()
        } else {
            input.kind.trim().into()
        },
        base_url: normalize_base_url(&input.base_url),
        api_key: input.api_key.trim().into(),
        model: input.model.trim().into(),
        temperature: input.temperature.clamp(0.0, 2.0),
        max_tokens: input.max_tokens,
        is_default: input.is_default,
        created_at,
        updated_at: now_ts(),
    }
}

fn validate_ai_profile(profile: &AiProviderProfile) -> CommandResult<()> {
    if profile.kind != "openai_compatible" {
        return Err("仅支持 OpenAI-compatible 接口。".into());
    }
    if profile.base_url.trim().is_empty() {
        return Err("Base URL 不能为空。".into());
    }
    if profile.api_key.trim().is_empty() {
        return Err("API Key 不能为空。".into());
    }
    if profile.model.trim().is_empty() {
        return Err("Model 不能为空。".into());
    }
    Ok(())
}

fn extract_response_text(content: &Value) -> String {
    match content {
        Value::String(text) => text.trim().to_string(),
        Value::Array(items) => items
            .iter()
            .map(|item| {
                item.get("text")
                    .and_then(Value::as_str)
                    .map(|text| text.trim().to_string())
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>()
            .join(""),
        _ => String::new(),
    }
}

fn build_ai_system_prompt(task_type: &str) -> &'static str {
    match task_type {
        "rewrite_block" => {
            "你是专业提示词编辑助手。请在保留原意的前提下改写目标 Block，让它更清晰、更具体、可直接用于 AI 生成。只输出改写后的正文，不要解释。"
        }
        "expand_block" => {
            "你是专业提示词编辑助手。请扩写目标 Block，让描述更丰富、层次更完整，但不要脱离原意。只输出扩写后的正文，不要解释。"
        }
        "compress_block" => {
            "你是专业提示词编辑助手。请压缩目标 Block，让内容更短、更干净、更适合提示词场景。只输出压缩后的正文，不要解释。"
        }
        _ => {
            "你是专业提示词写作助手。请根据给定的资产标题、标签和已有 Block，生成一段更完整、可直接复制使用的提示词。只输出最终提示词正文，不要解释，不要加引号。"
        }
    }
}

fn build_ai_user_prompt(input: &AiTaskInput) -> String {
    let blocks = input
        .blocks
        .iter()
        .enumerate()
        .map(|(index, block)| {
            let label = if block.label.trim().is_empty() {
                "未命名 Block"
            } else {
                block.label.trim()
            };
            let content = if block.content.trim().is_empty() {
                "（空）"
            } else {
                block.content.trim()
            };
            format!("{}. [{} / {}]\n{}", index + 1, label, block.block_type, content)
        })
        .collect::<Vec<_>>()
        .join("\n\n");

    let target_block = input
        .target_block_id
        .as_ref()
        .and_then(|target_id| input.blocks.iter().find(|block| &block.id == target_id));

    [
        format!(
            "资产标题：{}",
            if input.asset_title.trim().is_empty() {
                "未命名资产"
            } else {
                input.asset_title.trim()
            }
        ),
        format!(
            "目录类型：{}",
            if input.folder_type == "project" {
                "项目分镜"
            } else {
                "提示词库"
            }
        ),
        if input.tags.is_empty() {
            String::new()
        } else {
            format!("标签：{}", input.tags.join("，"))
        },
        input
            .context_remark
            .as_ref()
            .filter(|remark| !remark.trim().is_empty())
            .map(|remark| format!("备注：{}", remark.trim()))
            .unwrap_or_default(),
        String::new(),
        "当前 Blocks：".into(),
        if blocks.is_empty() {
            "（没有可用 Block）".into()
        } else {
            blocks
        },
        String::new(),
        target_block
            .map(|block| {
                format!(
                    "目标 Block：{}\n{}",
                    if block.label.trim().is_empty() {
                        "未命名 Block"
                    } else {
                        block.label.trim()
                    },
                    if block.content.trim().is_empty() {
                        "（空）"
                    } else {
                        block.content.trim()
                    }
                )
            })
            .unwrap_or_default(),
        input
            .user_instruction
            .as_ref()
            .filter(|instruction| !instruction.trim().is_empty())
            .map(|instruction| format!("用户补充要求：{}", instruction.trim()))
            .unwrap_or_default(),
    ]
    .into_iter()
    .filter(|line| !line.is_empty())
    .collect::<Vec<_>>()
    .join("\n")
}

async fn run_openai_compatible_request(
    profile: &AiProviderProfile,
    input: &AiTaskInput,
) -> CommandResult<AiTaskResult> {
    validate_ai_profile(profile)?;

    let client = Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .post(format!("{}/chat/completions", normalize_base_url(&profile.base_url)))
        .bearer_auth(profile.api_key.trim())
        .json(&ChatCompletionRequest {
            model: profile.model.trim(),
            temperature: profile.temperature,
            max_tokens: profile.max_tokens,
            messages: vec![
                ChatCompletionMessage {
                    role: "system",
                    content: build_ai_system_prompt(&input.task_type).to_string(),
                },
                ChatCompletionMessage {
                    role: "user",
                    content: build_ai_user_prompt(input),
                },
            ],
        })
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();

    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(if detail.trim().is_empty() {
            format!("AI 请求失败（{}）。", status)
        } else {
            detail
        });
    }

    let payload = response
        .json::<ChatCompletionResponse>()
        .await
        .map_err(|error| error.to_string())?;
    let text = payload
        .choices
        .first()
        .map(|choice| extract_response_text(&choice.message.content))
        .unwrap_or_default();

    if text.is_empty() {
        return Err("模型没有返回可用文本。".into());
    }

    Ok(AiTaskResult {
        text,
        raw_model: payload.model,
        usage: payload.usage,
    })
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

#[tauri::command]
fn ai_list_profiles(app: AppHandle) -> CommandResult<AiSettingsSnapshot> {
    load_ai_settings(&app)
}

#[tauri::command]
fn ai_save_profile(app: AppHandle, input: SaveAiProfileInput) -> CommandResult<AiSettingsSnapshot> {
    let current = load_ai_settings(&app)?;
    let existing = input
        .id
        .as_ref()
        .and_then(|profile_id| current.profiles.iter().find(|profile| &profile.id == profile_id));
    let next_profile = build_ai_profile(input, existing);
    validate_ai_profile(&next_profile)?;

    let profiles = if current.profiles.iter().any(|profile| profile.id == next_profile.id) {
        current
            .profiles
            .iter()
            .cloned()
            .map(|profile| {
                if profile.id == next_profile.id {
                    next_profile.clone()
                } else {
                    profile
                }
            })
            .collect::<Vec<_>>()
    } else {
        let mut next = vec![next_profile.clone()];
        next.extend(current.profiles.clone());
        next
    };

    write_ai_settings(
        &app,
        &AiSettingsSnapshot {
            default_profile_id: if next_profile.is_default {
                Some(next_profile.id.clone())
            } else {
                current.default_profile_id.clone()
            },
            profiles,
        },
    )
}

#[tauri::command]
fn ai_delete_profile(app: AppHandle, profile_id: String) -> CommandResult<AiSettingsSnapshot> {
    let current = load_ai_settings(&app)?;
    write_ai_settings(
        &app,
        &AiSettingsSnapshot {
            default_profile_id: if current.default_profile_id.as_deref() == Some(profile_id.as_str()) {
                None
            } else {
                current.default_profile_id.clone()
            },
            profiles: current
                .profiles
                .into_iter()
                .filter(|profile| profile.id != profile_id)
                .collect(),
        },
    )
}

#[tauri::command]
async fn ai_test_profile(_app: AppHandle, input: SaveAiProfileInput) -> CommandResult<String> {
    let profile = build_ai_profile(input, None);
    validate_ai_profile(&profile)?;

    let result = run_openai_compatible_request(
        &profile,
        &AiTaskInput {
            profile_id: profile.id.clone(),
            task_type: "compress_block".into(),
            folder_type: "library".into(),
            asset_title: "连接测试".into(),
            tags: vec![],
            blocks: vec![AiTaskBlockInput {
                id: "test_block".into(),
                block_type: "custom".into(),
                label: "".into(),
                content: "请只回复 OK".into(),
            }],
            target_block_id: Some("test_block".into()),
            user_instruction: Some("请只回复 OK".into()),
            context_remark: None,
        },
    )
    .await?;

    Ok(result.text)
}

#[tauri::command]
async fn ai_run_task(app: AppHandle, input: AiTaskInput) -> CommandResult<AiTaskResult> {
    let settings = load_ai_settings(&app)?;
    let profile = settings
        .profiles
        .iter()
        .find(|profile| profile.id == input.profile_id)
        .ok_or_else(|| "未找到对应的 AI 配置。".to_string())?;

    run_openai_compatible_request(profile, &input).await
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
            workbench_delete_prompt_asset,
            ai_list_profiles,
            ai_save_profile,
            ai_delete_profile,
            ai_test_profile,
            ai_run_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
