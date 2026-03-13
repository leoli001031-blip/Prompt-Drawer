use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderRecord {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub folder_type: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptAssetRow {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub payload: String,
    pub is_favorite: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkbenchSnapshot {
    pub folders: Vec<FolderRecord>,
    pub prompt_assets: Vec<PromptAssetRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageDescriptor {
    pub mode: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockTemplate {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub block_type: String,
    pub label: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetTemplateBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub label: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetTemplate {
    pub id: String,
    pub name: String,
    pub blocks: Vec<AssetTemplateBlock>,
    pub structure: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderTemplateBinding {
    pub folder_id: String,
    pub asset_template_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkbenchSettingsSnapshot {
    #[serde(default)]
    pub block_templates: Vec<BlockTemplate>,
    #[serde(default)]
    pub asset_templates: Vec<AssetTemplate>,
    #[serde(default)]
    pub folder_template_bindings: Vec<FolderTemplateBinding>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateFolderInput {
    pub name: String,
    #[serde(rename = "type")]
    pub folder_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFolderInput {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub folder_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePromptAssetInput {
    pub folder_id: String,
    pub title: String,
    pub payload: String,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePromptAssetInput {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub payload: String,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiProviderProfile {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f64,
    pub max_tokens: Option<u32>,
    pub is_default: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSettingsSnapshot {
    pub default_profile_id: Option<String>,
    pub profiles: Vec<AiProviderProfile>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SaveAiProfileInput {
    pub id: Option<String>,
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f64,
    pub max_tokens: Option<u32>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AiTaskBlockInput {
    pub id: String,
    #[serde(rename = "type")]
    pub block_type: String,
    pub label: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AiTaskInput {
    pub profile_id: String,
    pub task_type: String,
    pub folder_type: String,
    pub asset_title: String,
    pub tags: Vec<String>,
    pub blocks: Vec<AiTaskBlockInput>,
    pub target_block_id: Option<String>,
    pub user_instruction: Option<String>,
    pub context_remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiUsage {
    pub prompt_tokens: Option<u32>,
    pub completion_tokens: Option<u32>,
    pub total_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiTaskResult {
    pub text: String,
    pub raw_model: Option<String>,
    pub usage: Option<AiUsage>,
}

#[derive(Debug, Serialize)]
pub struct ChatCompletionRequest<'a> {
    pub model: &'a str,
    pub temperature: f64,
    pub max_tokens: Option<u32>,
    pub messages: Vec<ChatCompletionMessage<'a>>,
}

#[derive(Debug, Serialize)]
pub struct ChatCompletionMessage<'a> {
    pub role: &'a str,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatCompletionResponse {
    pub model: Option<String>,
    pub choices: Vec<ChatCompletionChoice>,
    pub usage: Option<AiUsage>,
}

#[derive(Debug, Deserialize)]
pub struct ChatCompletionChoice {
    pub message: ChatCompletionMessageResponse,
}

#[derive(Debug, Deserialize)]
pub struct ChatCompletionMessageResponse {
    pub content: Value,
}
