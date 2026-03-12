use reqwest::Client;
use std::time::Duration;

use crate::ai::prompts::{build_ai_system_prompt, build_ai_user_prompt, extract_response_text};
use crate::ai::settings::{normalize_base_url, validate_ai_profile};
use crate::support::CommandResult;
use crate::types::{
    AiProviderProfile, AiTaskInput, AiTaskResult, ChatCompletionMessage, ChatCompletionRequest,
    ChatCompletionResponse,
};

pub async fn run_openai_compatible_request(
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
