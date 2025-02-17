use crate::{AppState, DashboardOptions};

#[tauri::command]
pub fn get_config(state: tauri::State<'_, AppState>) -> Result<DashboardOptions, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
pub fn set_config(
    state: tauri::State<'_, AppState>,
    config: DashboardOptions,
) -> Result<(), String> {
    let mut config_state = state.config.lock().unwrap();
    *config_state = config.clone();
    config
        .store(&state.option.config_path)
        .map_err(|err| format!("Failed to store config: {}", err))?;
    Ok(())
}
