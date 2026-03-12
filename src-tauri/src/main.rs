#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod db;
mod support;
mod types;
mod workbench;

use ai::commands::{ai_delete_profile, ai_list_profiles, ai_run_task, ai_save_profile, ai_test_profile};
use workbench::commands::{
    workbench_bootstrap, workbench_create_folder, workbench_create_prompt_asset,
    workbench_delete_folder, workbench_delete_prompt_asset, workbench_export_snapshot_json,
    workbench_list_folders, workbench_list_prompt_assets, workbench_schema_sql,
    workbench_storage_descriptor, workbench_update_folder, workbench_update_prompt_asset,
};

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
