use serde_json::Value;

use crate::types::AiTaskInput;

pub fn extract_response_text(content: &Value) -> String {
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

pub fn build_ai_system_prompt(task_type: &str) -> &'static str {
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

pub fn build_ai_user_prompt(input: &AiTaskInput) -> String {
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
