use rusqlite::{params, Connection};
use serde_json::json;

use crate::support::{make_id, now_ts, CommandResult};

pub fn seed_database(connection: &Connection) -> CommandResult<()> {
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
