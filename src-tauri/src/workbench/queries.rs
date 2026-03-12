use rusqlite::Connection;

use crate::support::CommandResult;
use crate::types::{FolderRecord, PromptAssetRow, WorkbenchSnapshot};

pub fn query_folders(connection: &Connection) -> CommandResult<Vec<FolderRecord>> {
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

pub fn query_prompt_assets(
    connection: &Connection,
    folder_id: Option<String>,
) -> CommandResult<Vec<PromptAssetRow>> {
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

pub fn build_snapshot(connection: &Connection) -> CommandResult<WorkbenchSnapshot> {
    Ok(WorkbenchSnapshot {
        folders: query_folders(connection)?,
        prompt_assets: query_prompt_assets(connection, None)?,
    })
}
