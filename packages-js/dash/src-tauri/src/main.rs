// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod options;
mod python;
mod server;
mod sources;
mod sync;
mod utils;
mod uv;
mod version;

use std::borrow;

use anyhow::Result;
use app::{AppState, ServerStatus};
use directories::ProjectDirs;
use log::info;
use once_cell::sync::Lazy;
use options::InstallOptions;
use python::Python;
use server::{Server, ServerOption};
use sources::py::{PythonVersion, PythonVersionRequest};
use tauri::Manager;
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

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[tauri::command]
fn get_token(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let token = state.get_token();
    Ok(token)
}

#[tauri::command]
fn get_server_state(state: tauri::State<'_, AppState>) -> Result<ServerStatus, String> {
    let server_state = state.get_server_state();
    Ok(server_state)
}

fn main() {
    let data_dir = get_data_dir();
    let bin_dir = APP_DIRECTORY.data_local_dir();
    let options = InstallOptions {
        python_version: PYTHON_VERSION.clone(),
        python_path: bin_dir.join("python"),
        uv_path: bin_dir.join("uv"),
        workdir: data_dir.to_path_buf(),
    };
    let server_options = ServerOption {
        data_dir: options.workdir.clone(),
        port: 26423,
    };

    let python = if cfg!(dev) {
        Python {
            path: data_dir.join("../.venv"),
            python_bin: data_dir.join("../.venv/Scripts/python.exe"),
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
        Python::ensure(&options).unwrap()
    };
    let uv = Uv::ensure(&options, &python.python_bin).unwrap();
    let server = Server::new(server_options, python, uv);

    server.start().unwrap();

    let app_state = AppState::new(server);

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
                .build(),
        )
        .manage(app_state.clone())
        .setup(move |app| {
            let window = app.get_window("main").unwrap();
            app_state.set_window(Some(window.clone()));
            set_shadow(&window, true).unwrap();
            window
                .emit("server-state", app_state.get_server_state())
                .unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_token, get_server_state])
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
