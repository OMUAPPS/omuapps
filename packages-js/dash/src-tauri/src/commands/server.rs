use std::{borrow, fs::create_dir_all, path::PathBuf};

use crate::{
    progress::Progress,
    python::Python,
    server::Server,
    sources::py::PythonVersion,
    utils::{archive::pack_archive, filesystem::remove_dir_all},
    uv::Uv,
    AppState,
};
use log::{info, warn};
use tauri::Emitter;

#[tauri::command]
pub async fn start_server(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    let on_progress = move |progress: Progress| {
        info!("{:?}", progress);
        window.emit("server_state", progress).unwrap();
    };
    info!("Starting server");
    let mut server_mutex = state.server.lock().map_err(|err| err.to_string())?;
    if server_mutex.is_some() {
        let server = server_mutex.as_ref().unwrap();
        if server.is_running() {
            on_progress(Progress::ServerAlreadyStarted {
                msg: "Existing server is already running".to_string(),
            });
            return Ok(None);
        };
    };

    let config = state.config.lock().unwrap().clone();
    let python = Python::ensure(&state.options, &on_progress).map_err(|err| err.to_string())?;
    let uv = Uv::ensure(&state.options, &python.python_bin, &on_progress)
        .map_err(|err| err.to_string())?;
    let server = match Server::ensure_server(
        config.server.clone(),
        python,
        uv,
        &on_progress,
        state.app_handle.clone(),
    ) {
        Ok(server) => server,
        Err(err) => {
            return Err(err.to_string());
        }
    };

    if server.already_started {
        on_progress(Progress::ServerAlreadyStarted {
            msg: "Server already started".to_string(),
        });
    } else {
        on_progress(Progress::ServerStarting {
            msg: "Starting server".to_string(),
        });
        server.start(&on_progress).map_err(|err| err.to_string())?;
    }

    let token = server.token.clone();
    *server_mutex = Some(server);
    Ok(Some(token))
}

#[tauri::command]
pub async fn stop_server(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), CleanEnvironmentError> {
    let on_progress = move |progress: Progress| {
        info!("{:?}", progress);
        window.emit("server_state", progress).unwrap();
    };

    let options = &state.options;
    let python = if cfg!(dev) {
        Python {
            path: options.workdir.join("../.venv"),
            python_bin: options.workdir.join("../.venv/Scripts/python.exe"),
            version: PythonVersion {
                major: 3,
                minor: 12,
                patch: 3,
                suffix: None,
                arch: borrow::Cow::Borrowed(""),
                name: borrow::Cow::Borrowed(""),
                os: borrow::Cow::Borrowed(""),
            },
        }
    } else {
        match Python::ensure(&options, &on_progress) {
            Ok(python) => python,
            Err(err) => {
                return Err(CleanEnvironmentError::PythonError(err.to_string()));
            }
        }
    };

    on_progress(Progress::ServerStopping {
        msg: "Stopping server".to_string(),
    });
    match Server::stop_server(&python, &state.config.lock().unwrap().server) {
        Ok(_) => {}
        Err(err) => {
            // return Err(CleanEnvironmentError::ServerError(err.to_string()));
            warn!("Failed to stop server: {}", err);
        }
    };
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(tag = "type", content = "message")]
pub enum CleanEnvironmentError {
    DevMode(String),
    PythonError(String),
    ServerError(String),
    RemovePythonError(String),
    RemoveUvError(String),
}

#[tauri::command]
pub async fn clean_environment(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), CleanEnvironmentError> {
    let on_progress = move |progress: Progress| {
        info!("{:?}", progress);
        window.emit("server_state", progress).unwrap();
    };

    let options = &state.options;
    let python = if cfg!(dev) {
        Python {
            path: options.workdir.join("../.venv"),
            python_bin: options.workdir.join("../.venv/Scripts/python.exe"),
            version: PythonVersion {
                major: 3,
                minor: 12,
                patch: 3,
                suffix: None,
                arch: borrow::Cow::Borrowed(""),
                name: borrow::Cow::Borrowed(""),
                os: borrow::Cow::Borrowed(""),
            },
        }
    } else {
        match Python::ensure(&options, &on_progress) {
            Ok(python) => python,
            Err(err) => {
                return Err(CleanEnvironmentError::PythonError(err.to_string()));
            }
        }
    };

    match Server::stop_server(&python, &state.config.lock().unwrap().server) {
        Ok(_) => {}
        Err(err) => {
            // return Err(CleanEnvironmentError::ServerError(err.to_string()));
            warn!("Failed to stop server: {}", err);
        }
    }

    match remove_dir_all(&options.python_path, |current, total| {
        on_progress(Progress::PythonRemoving {
            msg: "Removing python".to_string(),
            progress: current,
            total,
        });
    }) {
        Ok(_) => {}
        Err(err) => {
            on_progress(Progress::PythonRemoving {
                msg: format!("Failed to remove python: {}", err),
                progress: 0.0,
                total: 0.0,
            });
            return Err(CleanEnvironmentError::RemovePythonError(err.to_string()));
        }
    }
    match remove_dir_all(&options.uv_path, |current, total| {
        on_progress(Progress::UvRemoving {
            msg: "Removing uv".to_string(),
            progress: current,
            total,
        });
    }) {
        Ok(_) => {}
        Err(err) => {
            return Err(CleanEnvironmentError::RemoveUvError(err.to_string()));
        }
    }

    info!("Environment cleaned");

    Ok(())
}

#[tauri::command]
pub fn get_token(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let server = state.server.lock().unwrap();
    if server.is_none() {
        return Ok(None);
    };
    let server = server.as_ref().unwrap();
    Ok(Some(server.token.clone()))
}

#[tauri::command]
pub fn open_python_path(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let options = &state.options;
    open::that(&options.python_path)
        .map_err(|err| format!("Failed to open python path: {}", err))?;
    Ok(options.python_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_uv_path(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let options = &state.options;
    open::that(&options.uv_path).map_err(|err| format!("Failed to open uv path: {}", err))?;
    Ok(options.uv_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_log_file(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // pack log files into a tar archive
    let options = &state.options;
    let log_dir = options.workdir.join("logs");
    let document_dir: Option<PathBuf> = match directories::UserDirs::new() {
        Some(dirs) => dirs
            .document_dir()
            .map(|dir: &std::path::Path| dir.to_path_buf()),
        None => None,
    };
    let output_path = document_dir
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("omuapps");
    remove_dir_all(&output_path, |_, _| {}).ok();
    create_dir_all(&output_path)
        .map_err(|err| format!("Failed to create download directory: {}", err))?;
    pack_archive(&log_dir, &output_path.join("logs.tar.gz"))
        .map_err(|err| format!("Failed to pack log files: {}", err))?;
    open::that(&output_path).map_err(|err| format!("Failed to open log file: {}", err))?;
    Ok(output_path.to_string_lossy().to_string())
}
