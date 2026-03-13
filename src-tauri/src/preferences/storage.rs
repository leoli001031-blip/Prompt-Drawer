use tauri::{AppHandle, Manager};

use crate::support::CommandResult;
use crate::types::{
    AssetTemplate, AssetTemplateBlock, BlockTemplate, FolderTemplateBinding,
    WorkbenchSettingsSnapshot,
};

pub fn preferences_path(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    Ok(app_dir.join("workbench_settings.json"))
}

fn normalize_block_type(value: &str) -> String {
    match value.trim() {
        "character" | "camera" | "style" | "format" | "custom" => value.trim().into(),
        _ => "custom".into(),
    }
}

fn normalize_asset_template_block(block: AssetTemplateBlock) -> AssetTemplateBlock {
    AssetTemplateBlock {
        block_type: normalize_block_type(&block.block_type),
        label: block.label,
        content: block.content,
    }
}

fn parse_asset_template_structure(structure: &str) -> Vec<AssetTemplateBlock> {
    structure
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .map(|line| {
            let mut parts = line.splitn(2, "::");
            let label = parts.next().unwrap_or_default().trim().to_string();
            let content = parts.next().unwrap_or_default().trim().to_string();

            AssetTemplateBlock {
                block_type: "custom".into(),
                label,
                content,
            }
        })
        .collect()
}

fn normalize_folder_template_binding(
    binding: FolderTemplateBinding,
) -> Option<FolderTemplateBinding> {
    let folder_id = binding.folder_id.trim().to_string();
    let asset_template_id = binding.asset_template_id.trim().to_string();

    if folder_id.is_empty() || asset_template_id.is_empty() {
        return None;
    }

    Some(FolderTemplateBinding {
        folder_id,
        asset_template_id,
    })
}

pub fn normalize_settings(snapshot: WorkbenchSettingsSnapshot) -> WorkbenchSettingsSnapshot {
    let block_templates = snapshot
        .block_templates
        .into_iter()
        .map(|template| {
            let name = if template.name.trim().is_empty() {
                "未命名模板".to_string()
            } else {
                template.name.trim().to_string()
            };

            BlockTemplate {
                name,
                block_type: normalize_block_type(&template.block_type),
                ..template
            }
        })
        .collect::<Vec<_>>();

    let asset_templates = snapshot
        .asset_templates
        .into_iter()
        .map(|template| {
            let AssetTemplate {
                id,
                name,
                blocks,
                structure,
                created_at,
                updated_at,
            } = template;

            let normalized_structure = if structure.trim().is_empty() {
                blocks
                    .iter()
                    .map(|block| {
                        if block.content.trim().is_empty() {
                            block.label.clone()
                        } else {
                            format!("{}::{}", block.label, block.content)
                        }
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            } else {
                structure.clone()
            };

            let normalized_blocks = if blocks.is_empty() {
                parse_asset_template_structure(&normalized_structure)
            } else {
                blocks
                    .into_iter()
                    .map(normalize_asset_template_block)
                    .collect()
            };

            AssetTemplate {
                id,
                name: if name.trim().is_empty() {
                    "未命名模板".into()
                } else {
                    name.trim().into()
                },
                blocks: normalized_blocks,
                structure: normalized_structure,
                created_at,
                updated_at,
            }
        })
        .collect::<Vec<_>>();

    let asset_template_ids = asset_templates
        .iter()
        .map(|template| template.id.clone())
        .collect::<std::collections::HashSet<_>>();

    WorkbenchSettingsSnapshot {
        block_templates,
        asset_templates,
        folder_template_bindings: snapshot
            .folder_template_bindings
            .into_iter()
            .filter_map(normalize_folder_template_binding)
            .filter(|binding| asset_template_ids.contains(&binding.asset_template_id))
            .collect(),
    }
}

pub fn load_preferences(app: &AppHandle) -> CommandResult<WorkbenchSettingsSnapshot> {
    let path = preferences_path(app)?;
    if !path.exists() {
        return Ok(WorkbenchSettingsSnapshot {
            block_templates: vec![],
            asset_templates: vec![],
            folder_template_bindings: vec![],
        });
    }

    let raw = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let parsed =
        serde_json::from_str::<WorkbenchSettingsSnapshot>(&raw).map_err(|error| error.to_string())?;
    Ok(normalize_settings(parsed))
}

pub fn save_preferences(
    app: &AppHandle,
    snapshot: &WorkbenchSettingsSnapshot,
) -> CommandResult<WorkbenchSettingsSnapshot> {
    let normalized = normalize_settings(snapshot.clone());
    let raw = serde_json::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    std::fs::write(preferences_path(app)?, raw).map_err(|error| error.to_string())?;
    Ok(normalized)
}
