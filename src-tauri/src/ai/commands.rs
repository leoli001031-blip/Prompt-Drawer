use tauri::AppHandle;

use crate::ai::client::run_openai_compatible_request;
use crate::ai::settings::{build_ai_profile, load_ai_settings, validate_ai_profile, write_ai_settings};
use crate::support::CommandResult;
use crate::types::{AiSettingsSnapshot, AiTaskBlockInput, AiTaskInput, AiTaskResult, SaveAiProfileInput};

#[tauri::command]
pub fn ai_list_profiles(app: AppHandle) -> CommandResult<AiSettingsSnapshot> {
    load_ai_settings(&app)
}

#[tauri::command]
pub fn ai_save_profile(app: AppHandle, input: SaveAiProfileInput) -> CommandResult<AiSettingsSnapshot> {
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
pub fn ai_delete_profile(app: AppHandle, profile_id: String) -> CommandResult<AiSettingsSnapshot> {
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
pub async fn ai_test_profile(_app: AppHandle, input: SaveAiProfileInput) -> CommandResult<String> {
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
pub async fn ai_run_task(app: AppHandle, input: AiTaskInput) -> CommandResult<AiTaskResult> {
    let settings = load_ai_settings(&app)?;
    let profile = settings
        .profiles
        .iter()
        .find(|profile| profile.id == input.profile_id)
        .ok_or_else(|| "未找到对应的 AI 配置。".to_string())?;

    run_openai_compatible_request(profile, &input).await
}
