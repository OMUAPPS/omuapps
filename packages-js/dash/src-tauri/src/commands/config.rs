use crate::{AppConfig, AppState};

#[tauri::command]
pub fn get_config(state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
pub fn set_config(state: tauri::State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    let mut config_state = state.config.lock().unwrap();
    *config_state = config.clone();
    config
        .store(&state.options.config_path)
        .map_err(|err| format!("Failed to store config: {}", err))?;
    Ok(())
}
