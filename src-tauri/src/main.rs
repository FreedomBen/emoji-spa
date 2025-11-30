#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[cfg(test)]
mod icon_support;

#[tauri::command]
fn close_app_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.close().map_err(|error| error.to_string())?;
    }
    app_handle.exit(0);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![close_app_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
