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
use sources::py::PythonVersion;
use std::{
    borrow,
    fs::{create_dir_all, remove_dir_all},
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{api::path::data_dir, Manager};
use tauri_plugin_log::LogTarget;
use uv::Uv;
use window_shadows::set_shadow;

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

struct AppState {
    option: AppOptions,
    server: Arc<Mutex<Option<Server>>>,
    app_handle: Arc<Mutex<Option<tauri::AppHandle>>>,
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
    {
        let server = state.server.lock().unwrap();
        if server.is_some() {
            on_progress(Progress::ServerAlreadyStarted {
                msg: "Server already started".to_string(),
            });
            return Ok(None);
        };
    }

    let options = state.option.clone();
    let python = Python::ensure(&options, &on_progress).unwrap();
    let uv = Uv::ensure(&options, &python.python_bin, &on_progress).unwrap();
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
        server.start(&on_progress).unwrap();
    }

    let token = server.token.clone();
    *state.server.lock().unwrap() = Some(server);
    Ok(Some(token))
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
    if cfg!(dev) {
        return Err(CleanEnvironmentError::DevMode(
            "Cannot clean environment in dev mode".to_string(),
        ));
    }
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

    let server = state.server.lock().unwrap();
    if server.is_some() {
        match Server::stop_server(&python, &options.server_options) {
            Ok(_) => {}
            Err(err) => {
                return Err(CleanEnvironmentError::ServerError(err.to_string()));
            }
        }
    };

    match remove_dir_all(&options.python_path) {
        Ok(_) => {}
        Err(err) => {
            return Err(CleanEnvironmentError::RemovePythonError(err.to_string()));
        }
    }
    match remove_dir_all(&options.uv_path) {
        Ok(_) => {}
        Err(err) => {
            return Err(CleanEnvironmentError::RemoveUvError(err.to_string()));
        }
    }

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
async fn generate_log_file(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // pack log files into a zip file, return the path
    let options = state.option.clone();
    let log_dir1 = options.workdir.join("logs");
    let log_dir2 = data_dir().unwrap().join("com.omuapps.app/logs");
    let log_files = vec![log_dir1, log_dir2];

    let download_dir: Option<PathBuf> = match directories::UserDirs::new() {
        Some(dirs) => dirs.document_dir().map(|dir| dir.to_path_buf()),
        None => None,
    };
    let archive_path = download_dir
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("omuapps");
    create_dir_all(&archive_path)
        .map_err(|err| format!("Failed to create download directory: {}", err))?;
    pack_archive(&log_files, &archive_path.join("logs.tar"))
        .map_err(|err| format!("Failed to pack log files: {}", err))?;
    open::that(&archive_path).map_err(|err| format!("Failed to open log file: {}", err))?;
    Ok(archive_path.to_string_lossy().to_string())
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
    };
    let app_handle = Arc::new(Mutex::new(None));
    let server_state = AppState {
        option: options,
        server: Arc::new(Mutex::new(None)),
        app_handle: app_handle.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            info!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit_all("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([LogTarget::Stdout, LogTarget::Webview, LogTarget::LogDir])
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            start_server,
            clean_environment,
            get_token,
            generate_log_file,
            open_python_path,
            open_uv_path
        ])
        .setup(move |app| {
            let main_window = app.get_window("main").unwrap();
            set_shadow(&main_window, true).unwrap();

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
