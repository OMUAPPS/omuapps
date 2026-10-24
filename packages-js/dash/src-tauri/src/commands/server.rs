use std::{fs::create_dir_all, path::PathBuf};

use crate::{
    server::{Server, ServerEnsureError, ServerEnsureProgress},
    utils::{archive::pack_archive, filesystem::remove_dir_all},
    AppState,
};
use log::info;
use tauri::Emitter;

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
    ServerEnsureError { reason: ServerEnsureError },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StartProgress {
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
    let server = Server::ensure_server(
        &state.server_config,
        &state.options,
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
    ServerEnsureError { reason: ServerEnsureError },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum StopProgress {
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

    on_progress(StopProgress::ServerStopping {
        msg: "Stopping server".to_string(),
    });
    Server::stop_server(&Server::executable(), &state.server_config).map_err(|err| {
        StopError::ServerEnsureError {
            reason: ServerEnsureError::StopFailed { msg: err },
        }
    })?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum CleanError {
    ServerError { reason: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum CleanProgress {
    Server { progress: ServerEnsureProgress },
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

    Server::stop_server(&Server::executable(), &state.server_config)
        .map_err(|err| CleanError::ServerError { reason: err })?;
    Server::remove_legacy(&state.options, &|progress| {
        on_progress(CleanProgress::Server { progress })
    });

    info!("Environment cleaned");

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UninstallProgress {
    PluginRemoving {},
    AppDataRemoving { progress: Progress },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UninstallError {
    ServerError { reason: String },
    RemoveAppDataError { reason: String },
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
    let executable = Server::executable();
    Server::stop_server(&executable, &state.server_config)
        .map_err(|err| UninstallError::ServerError { reason: err })?;

    on_progress(UninstallProgress::PluginRemoving {});
    Server::uninstall(&executable, &state.server_config)
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

    Server::remove_legacy(options, &|_| {});

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
