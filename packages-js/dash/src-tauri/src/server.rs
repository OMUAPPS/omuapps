use std::io::BufRead;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use log::info;
use rand::Rng;
use tauri::{AppHandle, Manager};

use crate::version::VERSION;
use crate::Progress;
use crate::{python::Python, uv::Uv};
const LATEST_PIP: &str = "pip==23.3.2";

#[derive(Debug, Clone)]
pub struct ServerOption {
    pub data_dir: PathBuf,
    pub port: u16,
}

pub struct Server {
    option: ServerOption,
    python: Python,
    uv: Uv,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    pub token: String,
    pub already_started: bool,
}

impl Server {
    pub fn ensure_server(
        option: ServerOption,
        python: Python,
        uv: Uv,
        on_progress: &(impl Fn(Progress) + Send + 'static),
        app_handle: Arc<Mutex<Option<AppHandle>>>,
    ) -> Result<Self, String> {
        let mut already_started = !is_port_free(option.port);

        let version = Self::read_version(&option)?;
        let needs_update = version.as_deref() != Some(VERSION);
        let requirements = format!("omuserver=={}", VERSION);
        if already_started && needs_update {
            uv.update(LATEST_PIP, &requirements, on_progress)
                .map_err(|err| err.to_string())?;
            on_progress(Progress::ServerStoppping(format!(
                "Server version mismatch ({} != {}), stopping server",
                version.unwrap(),
                VERSION
            )));
            Self::stop_server(on_progress, &python, &option)?;
            already_started = false;
        }

        let token = if already_started {
            match Self::read_token(&option) {
                Ok(token) => token,
                Err(err) => {
                    on_progress(Progress::ServerTokenReadFailed(err.clone()));
                    return Err(err);
                }
            }
        } else {
            match Self::generate_token(&option, on_progress) {
                Ok(value) => value,
                Err(value) => return Err(value),
            }
        };

        let server = Self {
            option,
            python,
            uv,
            app_handle,
            token,
            already_started,
        };

        if !server.option.data_dir.exists() {
            std::fs::create_dir_all(&server.option.data_dir).map_err(|err| {
                let msg = format!(
                    "Failed to create data directory at {}: {}",
                    server.option.data_dir.display(),
                    err
                );
                on_progress(Progress::ServerCreateDataDirFailed(msg.clone()));
                msg
            })?;
        }

        server
            .uv
            .update(LATEST_PIP, &requirements, on_progress)
            .map_err(|err| err.to_string())?;

        Ok(server)
    }

    fn stop_server(
        on_progress: &(impl Fn(Progress) + Send + 'static),
        python: &Python,
        option: &ServerOption,
    ) -> Result<(), String> {
        let mut cmd = python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--port");
        cmd.arg(option.port.to_string());
        cmd.arg("--stop");
        cmd.stderr(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.current_dir(&option.data_dir);
        let output = cmd.output().map_err(|err| {
            let msg = format!("Failed to stop server: {}", err);
            on_progress(Progress::ServerStoppping(msg.clone()));
            msg
        })?;
        Ok(if !output.status.success() {
            let msg = format!(
                "Failed to stop server: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            on_progress(Progress::ServerStopFailed(msg.clone()));
            return Err(msg);
        })
    }

    pub fn read_version(option: &ServerOption) -> Result<Option<String>, String> {
        let path = option.data_dir.join("VERSION");
        if !path.exists() {
            return Ok(None);
        }
        match std::fs::read_to_string(&path) {
            Ok(version) => Ok(Some(version)),
            Err(err) => Err(format!(
                "Failed to read version file at {}: {}",
                path.display(),
                err
            )),
        }
    }

    fn generate_token(
        option: &ServerOption,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<String, String> {
        let token = generate_token();
        if Self::save_token(&token, option).is_err() {
            on_progress(Progress::ServerTokenWriteFailed(
                "Failed to save token".to_string(),
            ));
            return Err("Failed to save token".to_string());
        }
        Ok(token)
    }

    fn save_token(token: &str, option: &ServerOption) -> Result<(), String> {
        let token_path = option.data_dir.join("token.txt");
        std::fs::write(token_path.clone(), token).map_err(|err| {
            format!(
                "Port {} is already in use, but failed to write token file at {}: {}",
                option.port,
                token_path.display(),
                err
            )
        })?;
        Ok(())
    }

    fn read_token(option: &ServerOption) -> Result<String, String> {
        let token_path = option.data_dir.join("token.txt");
        if !token_path.exists() {
            Err(format!(
                "Port {} is already in use, but token file does not exist at {}",
                option.port,
                token_path.display()
            ))?;
        }
        Ok(match std::fs::read_to_string(&token_path) {
            Ok(token) => token,
            Err(_) => Err(format!(
                "Port {} is already in use, but failed to read token file at {}",
                option.port,
                &token_path.display()
            ))?,
        })
    }

    pub fn start(&self, on_progress: &(impl Fn(Progress) + Send + 'static)) -> Result<(), String> {
        if self.already_started {
            return Err("Server already started".to_string());
        }
        let mut cmd = self.python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--token");
        cmd.arg(self.token.clone());
        cmd.arg("--port");
        cmd.arg(self.option.port.to_string());
        cmd.stderr(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.current_dir(&self.option.data_dir);
        let child = cmd.spawn().map_err(|err| {
            let msg = format!("Failed to start server: {}", err);
            on_progress(Progress::ServerStartFailed(msg.clone()));
            msg
        })?;
        let app_handle = self.app_handle.clone();
        std::thread::spawn(move || {
            Self::handle_io(child, app_handle).unwrap();
        });
        Ok(())
    }

    fn handle_io(
        mut child: std::process::Child,
        app_handle: Arc<Mutex<Option<AppHandle>>>,
    ) -> Result<(), String> {
        let window = app_handle
            .lock()
            .unwrap()
            .as_ref()
            .unwrap()
            .get_window("main")
            .unwrap();
        let on_progress = move |progress: Progress| {
            info!("{:?}", progress);
            window.emit("server_state", progress).unwrap();
        };

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        let stdout = std::thread::spawn(move || {
            std::io::BufReader::new(stdout).lines().for_each(|line| {
                if let Ok(line) = line {
                    info!("{}", line);
                }
            });
        });
        let stderr = std::thread::spawn(move || {
            std::io::BufReader::new(stderr).lines().for_each(|line| {
                if let Ok(line) = line {
                    info!("{}", line);
                }
            });
        });
        let exit_status = child.wait().map_err(|err| err.to_string())?;
        stdout.join().unwrap();
        stderr.join().unwrap();
        if !exit_status.success() {
            on_progress(Progress::ServerStartFailed(
                "Server exited with non-zero status".to_string(),
            ));
            Err("Server exited with non-zero status".to_string())?;
        }
        Ok(())
    }
}

fn generate_token() -> String {
    rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(32)
        .map(char::from)
        .collect::<String>()
}

fn is_port_free(port: u16) -> bool {
    let ok_127 = std::net::TcpListener::bind(("127.0.0.1", port)).is_ok();
    let ok_0 = std::net::TcpListener::bind(("0.0.0.0", port)).is_ok();
    ok_127 && ok_0
}
