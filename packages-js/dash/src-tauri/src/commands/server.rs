use std::{fs::create_dir_all, path::PathBuf};

use crate::{
    python::{Python, PythonEnsureError, PythonEnsureProgress},
    server::{Server, ServerEnsureError, ServerEnsureProgress},
    utils::{archive::pack_archive, filesystem::remove_dir_all},
    uv::{Uv, UvEnsureError, UvEnsureProgress},
    AppState,
};
use log::info;
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, serde::Serialize)]
pub struct Progress {
    msg: String,
    progress: f64,
    total: f64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StartError {
    ServerStartFailed { msg: String },
    PythonEnsureError { reason: PythonEnsureError },
    UvEnsureError { reason: UvEnsureError },
    ServerEnsureError { reason: ServerEnsureError },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StartProgress {
    Python { progress: PythonEnsureProgress },
    Uv { progress: UvEnsureProgress },
    Server { progress: ServerEnsureProgress },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StartResult {
    AlreadyRunning { token: String },
    Starting { token: String },
}

#[tauri::command]
pub async fn start_server(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<StartResult, StartError> {
    let on_progress = move |progress: StartProgress| {
        info!("{:?}", progress);
        window.emit("start_progress", progress).unwrap();
    };
    info!("Starting server");
    {
        let server_mutex = state
            .server
            .lock()
            .map_err(|err| StartError::ServerStartFailed {
                msg: format!("Failed to lock server mutex: {}", err),
            })?;
        if server_mutex.is_some() {
            let server = server_mutex.as_ref().unwrap();
            if server.is_running() {
                return Ok(StartResult::AlreadyRunning {
                    token: server.token.clone(),
                });
            };
        };
    }

    let callback = on_progress.clone();
    let python = Python::ensure(&state.options, move |progress: PythonEnsureProgress| {
        callback(StartProgress::Python { progress: progress });
    })
    .map_err(|err| StartError::PythonEnsureError { reason: err })?;
    let callback = on_progress.clone();
    let uv = Uv::ensure(
        &state.options,
        &python.python_bin,
        move |progress: UvEnsureProgress| {
            callback(StartProgress::Uv { progress });
        },
    )
    .map_err(|err| StartError::UvEnsureError { reason: err })?;
    let callback = on_progress.clone();
    let server = Server::ensure_server(
        &state.server_config,
        python,
        uv,
        move |progress: ServerEnsureProgress| {
            callback(StartProgress::Server { progress });
        },
        state.app_handle.clone(),
    )
    .map_err(|err| StartError::ServerEnsureError { reason: err })?;

    let token = server.token.clone();
    let mut server_mutex = state
        .server
        .lock()
        .map_err(|err| StartError::ServerStartFailed {
            msg: format!("Failed to lock server mutex: {}", err),
        })?;
    if server.already_started {
        *server_mutex = Some(server);
        Ok(StartResult::AlreadyRunning { token })
    } else {
        server
            .start()
            .map_err(|err| StartError::ServerEnsureError { reason: err })?;

        *server_mutex = Some(server);
        Ok(StartResult::Starting { token })
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StopError {
    PythonEnsureError { reason: PythonEnsureError },
    ServerEnsureError { reason: ServerEnsureError },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StopProgress {
    Python { progress: PythonEnsureProgress },
    ServerStopping { msg: String },
}

#[tauri::command]
pub async fn stop_server(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), StopError> {
    let on_progress = move |progress: StopProgress| {
        info!("{:?}", progress);
        window.emit("stop_progress", progress).unwrap();
    };

    let options = &state.options;
    let python = {
        let callback = on_progress.clone();
        Python::ensure(&options, move |progress| {
            callback(StopProgress::Python { progress });
        })
        .map_err(|err| StopError::PythonEnsureError { reason: err })?
    };

    on_progress(StopProgress::ServerStopping {
        msg: "Stopping server".to_string(),
    });
    Server::stop_server(&python, &state.server_config).map_err(|err| {
        StopError::ServerEnsureError {
            reason: ServerEnsureError::StopFailed { msg: err },
        }
    })?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum CleanError {
    PythonError { reason: PythonEnsureError },
    ServerError { reason: String },
    RemovePythonError { reason: String },
    RemoveUvError { reason: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum CleanProgress {
    Python { progress: PythonEnsureProgress },
    PythonRemoving { progress: Progress },
    UvRemoving { progress: Progress },
}

#[tauri::command]
pub async fn clean_environment(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), CleanError> {
    let on_progress = move |progress: CleanProgress| {
        info!("{:?}", progress);
        window.emit("clean_progress", progress).unwrap();
    };

    let options = &state.options;
    let python = {
        let callback = on_progress.clone();
        Python::ensure(&options, move |progress| {
            callback(CleanProgress::Python { progress });
        })
        .map_err(|err| CleanError::PythonError { reason: err })?
    };

    Server::stop_server(&python, &state.server_config)
        .map_err(|err| CleanError::ServerError { reason: err })?;

    let callback = on_progress.clone();
    remove_dir_all(&options.python_path, |current, total| {
        callback(CleanProgress::PythonRemoving {
            progress: Progress {
                msg: format!("Removing python at {}", options.python_path.display()),
                progress: current,
                total,
            },
        });
    })
    .map_err(|err| CleanError::RemovePythonError {
        reason: err.to_string(),
    })?;
    let callback = on_progress.clone();
    remove_dir_all(&options.uv_path, |current, total| {
        callback(CleanProgress::UvRemoving {
            progress: Progress {
                msg: format!("Removing uv at {}", options.uv_path.display()),
                progress: current,
                total,
            },
        });
    })
    .map_err(|err| CleanError::RemoveUvError {
        reason: err.to_string(),
    })?;

    info!("Environment cleaned");

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UninstallProgress {
    Python { progress: PythonEnsureProgress },
    PluginRemoving {},
    AppDataRemoving { progress: Progress },
    PythonRemoving { progress: Progress },
    UvRemoving { progress: Progress },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UninstallError {
    PythonError { reason: PythonEnsureError },
    ServerError { reason: String },
    RemoveAppDataError { reason: String },
    RemovePythonError { reason: String },
    RemoveUvError { reason: String },
}

#[tauri::command]
pub async fn uninstall(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), UninstallError> {
    let on_progress = move |progress: UninstallProgress| {
        info!("{:?}", progress);
        window.emit("uninstall_progress", progress).unwrap();
    };

    let options = &state.options;
    let python = {
        let callback = on_progress.clone();
        Python::ensure(&options, move |progress| {
            callback(UninstallProgress::Python { progress });
        })
        .map_err(|err| UninstallError::PythonError { reason: err })?
    };

    Server::stop_server(&python, &state.server_config)
        .map_err(|err| UninstallError::ServerError { reason: err })?;

    on_progress(UninstallProgress::PluginRemoving {});
    Server::uninstall(&python, &state.server_config)
        .map_err(|err| UninstallError::ServerError { reason: err })?;

    let callback = on_progress.clone();
    remove_dir_all(&options.workdir, |current, total| {
        callback(UninstallProgress::AppDataRemoving {
            progress: Progress {
                msg: format!("Removing app data at {}", options.workdir.display()),
                progress: current,
                total,
            },
        });
    })
    .map_err(|err| UninstallError::RemoveAppDataError {
        reason: err.to_string(),
    })?;

    let callback = on_progress.clone();
    remove_dir_all(&options.python_path, |current, total| {
        callback(UninstallProgress::PythonRemoving {
            progress: Progress {
                msg: format!("Removing python at {}", options.python_path.display()),
                progress: current,
                total,
            },
        });
    })
    .map_err(|err| UninstallError::RemovePythonError {
        reason: err.to_string(),
    })?;
    let callback = on_progress.clone();
    remove_dir_all(&options.uv_path, |current, total| {
        callback(UninstallProgress::UvRemoving {
            progress: Progress {
                msg: format!("Removing uv at {}", options.uv_path.display()),
                progress: current,
                total,
            },
        });
    })
    .map_err(|err| UninstallError::RemoveUvError {
        reason: err.to_string(),
    })?;

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
