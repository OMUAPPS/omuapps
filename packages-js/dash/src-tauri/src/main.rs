// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod options;
mod python;
mod server;
mod sources;
mod sync;
mod utils;
mod uv;
mod version;

use crate::{
    commands::*,
    options::AppOptions,
    server::{Server, ServerConfig},
};
use directories::ProjectDirs;
use log::info;
use once_cell::sync::Lazy;
use options::AppConfig;
use serde_json::Value;
use std::{
    env,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;
use tauri_plugin_log::{Target, TargetKind};

static APP_DIRECTORY: Lazy<ProjectDirs> =
    Lazy::new(|| match ProjectDirs::from("com", "OMUAPPS", "Dashboard") {
        Some(proj_dirs) => proj_dirs,
        None => panic!("Failed to get project directories!"),
    });

struct AppState {
    options: AppOptions,
    config: Arc<Mutex<AppConfig>>,
    server_config: ServerConfig,
    server: Arc<Mutex<Option<Server>>>,
    app_handle: Arc<Mutex<Option<tauri::AppHandle>>>,
}

impl AppState {
    pub fn update_config(&self, f: impl FnOnce(&mut AppConfig)) {
        let mut config = self.config.lock().unwrap();
        f(&mut config);
        config.store(&self.options.appdir).unwrap();
    }
}

#[derive(Clone, serde::Serialize)]
struct LaunchPayload {
    args: Vec<String>,
    cwd: String,
}

fn main() {
    let options = AppOptions::ensure()
        .map_err(|err| {
            eprintln!("Failed to ensure app options: {}", err);
            std::process::exit(1);
        })
        .unwrap();
    let app_config = AppConfig::ensure(&options);
    let mut server_config = ServerConfig::ensure(&options);
    server_config.workdir = options.workdir.clone();
    let app_handle = Arc::new(Mutex::new(None));
    let app_state = AppState {
        options: options.clone(),
        server: Arc::new(Mutex::new(None)),
        app_handle: app_handle.clone(),
        config: Arc::new(Mutex::new(app_config.clone())),
        server_config: server_config,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::Folder {
                        path: options.get_log_dir(),
                        file_name: Some(
                            chrono::Local::now()
                                .format("%H-%M-%S-dashboard")
                                .to_string(),
                        ),
                    }),
                ])
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            info!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit("single-instance", LaunchPayload { args: argv, cwd })
                .unwrap();
        }))
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            clean_environment,
            uninstall,
            get_token,
            get_config,
            set_config,
            create_webview_window,
            get_cookies,
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
            *app_handle.lock().unwrap() = Some(app.handle().clone());

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            match app.cli().matches() {
                Ok(matches) => {
                    if Some(Value::Bool(true))
                        == matches.args.get("background").map(|arg| arg.value.clone())
                    {
                        info!("Running dashboard in background.")
                    }
                }
                Err(_) => {}
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
