use tauri::AppHandle;

use crate::preferences::storage::{load_preferences, save_preferences};
use crate::support::CommandResult;
use crate::types::WorkbenchSettingsSnapshot;

#[tauri::command]
pub fn preferences_load(app: AppHandle) -> CommandResult<WorkbenchSettingsSnapshot> {
    load_preferences(&app)
}

#[tauri::command]
pub fn preferences_save(
    app: AppHandle,
    snapshot: WorkbenchSettingsSnapshot,
) -> CommandResult<WorkbenchSettingsSnapshot> {
    save_preferences(&app, &snapshot)
}
