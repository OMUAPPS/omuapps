// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod options;
mod progress;
mod python;
mod server;
mod sources;
mod sync;
mod utils;
mod uv;
mod version;

use crate::{
    progress::Progress,
    python::Python,
    server::{Server, ServerOption},
    sources::py::PythonVersionRequest,
    utils::archive::pack_archive,
};
use anyhow::Result;
use directories::ProjectDirs;
use log::{info, warn};
use once_cell::sync::Lazy;
use options::AppOptions;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sources::py::PythonVersion;
use std::{
    borrow,
    fs::create_dir_all,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;
use tauri_plugin_log::{Target, TargetKind};
use utils::filesystem::remove_dir_all;
use uv::Uv;

static APP_DIRECTORY: Lazy<ProjectDirs> =
    Lazy::new(|| match ProjectDirs::from("com", "OMUAPPS", "Dashboard") {
        Some(proj_dirs) => proj_dirs,
        None => panic!("Failed to get project directories!"),
    });

static PYTHON_VERSION: PythonVersionRequest = PythonVersionRequest {
    name: None,
    arch: None,
    os: None,
    major: 3,
    minor: Some(12),
    patch: Some(3),
    suffix: None,
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    pub enable_beta: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self { enable_beta: false }
    }
}

impl Config {
    pub fn ensure_exists(path: &PathBuf) -> Self {
        if !path.exists() {
            let config = Config::default();
            config.store(path).unwrap();
            config
        } else {
            Config::load(path).unwrap()
        }
    }

    pub fn store(&self, path: &PathBuf) -> Result<(), std::io::Error> {
        let content = serde_json::to_string_pretty(self).unwrap();
        std::fs::write(path, content)
    }

    pub fn load(path: &PathBuf) -> Result<Self, std::io::Error> {
        let content = std::fs::read_to_string(path)?;
        let config = serde_json::from_str(&content).unwrap();
        Ok(config)
    }
}

struct AppState {
    option: AppOptions,
    server: Arc<Mutex<Option<Server>>>,
    app_handle: Arc<Mutex<Option<tauri::AppHandle>>>,
    config: Arc<Mutex<Config>>,
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    window.hide().unwrap();
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[tauri::command]
async fn start_server(
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

    let options = state.option.clone();
    let python = Python::ensure(&options, &on_progress).map_err(|err| err.to_string())?;
    let uv =
        Uv::ensure(&options, &python.python_bin, &on_progress).map_err(|err| err.to_string())?;
    let server = match Server::ensure_server(
        options.server_options,
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
async fn stop_server(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), CleanEnvironmentError> {
    let on_progress = move |progress: Progress| {
        info!("{:?}", progress);
        window.emit("server_state", progress).unwrap();
    };

    let options = state.option.clone();
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
    match Server::stop_server(&python, &options.server_options) {
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
enum CleanEnvironmentError {
    DevMode(String),
    PythonError(String),
    ServerError(String),
    RemovePythonError(String),
    RemoveUvError(String),
}

#[tauri::command]
async fn clean_environment(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), CleanEnvironmentError> {
    let on_progress = move |progress: Progress| {
        info!("{:?}", progress);
        window.emit("server_state", progress).unwrap();
    };

    let options = state.option.clone();
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

    match Server::stop_server(&python, &options.server_options) {
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
fn open_python_path(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let options = state.option.clone();
    open::that(&options.python_path)
        .map_err(|err| format!("Failed to open python path: {}", err))?;
    Ok(options.python_path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_uv_path(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let options = state.option.clone();
    open::that(&options.uv_path).map_err(|err| format!("Failed to open uv path: {}", err))?;
    Ok(options.uv_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_token(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let server = state.server.lock().unwrap();
    if server.is_none() {
        return Ok(None);
    };
    let server = server.as_ref().unwrap();
    Ok(Some(server.token.clone()))
}

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> Result<Config, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
fn set_config(state: tauri::State<'_, AppState>, config: Config) -> Result<(), String> {
    let mut config_state = state.config.lock().unwrap();
    *config_state = config.clone();
    config
        .store(&state.option.config_path)
        .map_err(|err| format!("Failed to store config: {}", err))?;
    Ok(())
}

#[tauri::command]
async fn generate_log_file(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // pack log files into a tar archive
    let options = state.option.clone();
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

fn main() {
    let data_dir = get_data_dir();
    create_dir_all(&data_dir).unwrap();
    let bin_dir = APP_DIRECTORY.data_local_dir();

    let options = AppOptions {
        python_version: PYTHON_VERSION.clone(),
        python_path: bin_dir.join("python"),
        uv_path: bin_dir.join("uv"),
        workdir: data_dir.clone(),
        server_options: ServerOption {
            data_dir: data_dir.clone(),
            port: 26423,
        },
        config_path: bin_dir.join("config.json"),
    };
    let app_handle = Arc::new(Mutex::new(None));
    let config = Config::ensure_exists(&options.config_path);
    let server_state = AppState {
        option: options,
        server: Arc::new(Mutex::new(None)),
        app_handle: app_handle.clone(),
        config: Arc::new(Mutex::new(config.clone())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            info!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::Folder {
                        path: data_dir.join("logs"),
                        file_name: None,
                    }),
                ])
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            close_window,
            start_server,
            stop_server,
            clean_environment,
            get_token,
            get_config,
            set_config,
            generate_log_file,
            open_python_path,
            open_uv_path
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .setup(move |app| {
            let main_window = app.get_webview_window("main").unwrap();

            match app.cli().matches() {
                Ok(matches) => {
                    if Some(Value::Bool(true))
                        == matches.args.get("background").map(|arg| arg.value.clone())
                    {
                        main_window.hide().unwrap();
                    }
                }
                Err(_) => {}
            }

            *app_handle.lock().unwrap() = Some(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_data_dir() -> std::path::PathBuf {
    if cfg!(dev) {
        let path = std::env::current_dir().unwrap();
        let path = path.join("../../../appdata");
        return path;
    }
    return APP_DIRECTORY.data_dir().to_path_buf();
}
