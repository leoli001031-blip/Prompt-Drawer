use tauri::{AppHandle, Manager};

use crate::support::{make_id, now_ts, CommandResult};
use crate::types::{AiProviderProfile, AiSettingsSnapshot, SaveAiProfileInput};

pub fn ai_settings_path(app: &AppHandle) -> CommandResult<std::path::PathBuf> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    Ok(app_dir.join("ai_profiles.json"))
}

pub fn normalize_base_url(value: &str) -> String {
    value.trim_end_matches('/').to_string()
}

pub fn normalize_ai_settings(snapshot: AiSettingsSnapshot) -> AiSettingsSnapshot {
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

pub fn load_ai_settings(app: &AppHandle) -> CommandResult<AiSettingsSnapshot> {
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

pub fn write_ai_settings(
    app: &AppHandle,
    snapshot: &AiSettingsSnapshot,
) -> CommandResult<AiSettingsSnapshot> {
    let normalized = normalize_ai_settings(snapshot.clone());
    let raw = serde_json::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    std::fs::write(ai_settings_path(app)?, raw).map_err(|error| error.to_string())?;
    Ok(normalized)
}

pub fn build_ai_profile(
    input: SaveAiProfileInput,
    existing: Option<&AiProviderProfile>,
) -> AiProviderProfile {
    let created_at = existing.map(|profile| profile.created_at).unwrap_or_else(now_ts);
    AiProviderProfile {
        id: input.id.unwrap_or_else(|| {
            existing
                .map(|profile| profile.id.clone())
                .unwrap_or_else(|| make_id("profile"))
        }),
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

pub fn validate_ai_profile(profile: &AiProviderProfile) -> CommandResult<()> {
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
