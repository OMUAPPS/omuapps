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
use log::info;
use once_cell::sync::Lazy;
use options::AppOptions;
use sources::py::PythonVersion;
use std::{
    borrow,
    fs::create_dir_all,
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
            on_progress(Progress::ServerAlreadyStarted(
                "Server already started".to_string(),
            ));
            return Ok(None);
        };
    }

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
        Python::ensure(&options, &on_progress).unwrap()
    };
    let uv = Uv::ensure(&options, &python.python_bin, &on_progress).unwrap();
    let server = Server::ensure_server(
        options.server_options,
        python,
        uv,
        &on_progress,
        state.app_handle.clone(),
    );
    let server = match server {
        Ok(server) => server,
        Err(err) => {
            return Err(err.to_string());
        }
    };

    on_progress(Progress::ServerStarting("Starting server".to_string()));
    server.start(&on_progress).unwrap();

    let token = server.token.clone();
    *state.server.lock().unwrap() = Some(server);
    Ok(Some(token))
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
fn generate_log_file(state: tauri::State<'_, AppState>) -> Result<(), String> {
    // pack log files into a zip file, return the path
    let options = state.option.clone();
    let log_dir1 = options.workdir.join("logs");
    let log_dir2 = data_dir().unwrap().join("com.omuapps.app/logs");
    let log_files = vec![log_dir1, log_dir2];

    // generate to download path
    let download_dir: Option<PathBuf> = match directories::UserDirs::new() {
        Some(dirs) => dirs.document_dir().map(|dir| dir.to_path_buf()),
        None => None,
    };
    let zip_path = download_dir
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("omuapps");
    create_dir_all(&zip_path)
        .map_err(|err| format!("Failed to create download directory: {}", err))?;
    pack_archive(&log_files, &zip_path.join("logs.zip"))
        .map_err(|err| format!("Failed to pack log files: {}", err))?;
    // open the zip file in the file manager
    open::that(zip_path).map_err(|err| format!("Failed to open log file: {}", err))?;
    Ok(())
}

fn main() {
    let data_dir = get_data_dir();
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
            get_token,
            generate_log_file
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
    return data_dir()
        .map(|dir| dir.to_path_buf())
        .unwrap_or(APP_DIRECTORY.data_dir().to_path_buf());
}
