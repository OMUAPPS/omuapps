use std::fs::canonicalize;
use std::io::BufRead;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use log::{info, warn};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::utils::platform::current_exe;
use tauri::{AppHandle, Emitter};

use crate::options::AppOptions;
use crate::uv::{UvEnsureError, UvEnsureProgress};
use crate::version::VERSION;
use crate::{python::Python, uv::Uv};

const LATEST_PIP: &str = "pip==23.3.2";
const RESTART_CODE: i32 = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub data_dir: PathBuf,
    pub port: u16,
    pub hash: String,
}

impl ServerConfig {
    pub fn create(options: &AppOptions) -> Self {
        Self {
            data_dir: options.workdir.clone(),
            port: 26423,
            hash: generate_hash(),
        }
    }
}

fn generate_hash() -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    let random_bytes: [u8; 16] = rand::random();
    hasher.update(&random_bytes);
    format!("{:x}", hasher.finalize())
}

pub struct ServerProcess {
    pub handle: Arc<Mutex<std::process::Child>>,
}

pub struct Server {
    config: ServerConfig,
    python: Python,
    uv: Uv,
    process: Arc<Mutex<Option<ServerProcess>>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    pub token: String,
    pub already_started: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerState {
    ServerStopped { msg: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerEnsureProgress {
    UpdatingDependencies { progress: UvEnsureProgress },
    ServerStopping { msg: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerEnsureError {
    VersionReadFailed { msg: String },
    UpdateDependenciesFailed { reason: UvEnsureError },
    StopFailed { msg: String },
    TokenReadFailed { msg: String },
    TokenWriteFailed { msg: String },
    CreateDataDirFailed { msg: String },
    StartFailed { msg: String },
    AlreadyRunning { msg: String },
}

impl Server {
    pub fn ensure_server(
        config: ServerConfig,
        python: Python,
        uv: Uv,
        on_progress: impl Fn(ServerEnsureProgress) + Send + Sync + Clone + 'static,
        app_handle: Arc<Mutex<Option<AppHandle>>>,
    ) -> Result<Self, ServerEnsureError> {
        let mut already_started = !is_port_free(config.port);

        let version = Self::read_version(&config)?;
        let needs_update = version.as_deref() != Some(VERSION);
        let requirements = format!("omuserver=={}", VERSION);
        if already_started && needs_update {
            let callback = on_progress.clone();
            uv.update(LATEST_PIP, &requirements, move |progress| {
                callback(ServerEnsureProgress::UpdatingDependencies { progress });
            })
            .map_err(|err| ServerEnsureError::UpdateDependenciesFailed { reason: err })?;
            on_progress(ServerEnsureProgress::ServerStopping {
                msg: format!(
                    "Server version mismatch ({} != {}), stopping server",
                    version.unwrap(),
                    VERSION
                ),
            });
            Self::stop_server(&python, &config)
                .map_err(|err| ServerEnsureError::StopFailed { msg: err })?;
            already_started = false;
        }

        let token = if already_started {
            Self::read_token(&config)
                .map_err(|err| ServerEnsureError::TokenReadFailed { msg: err })?
        } else {
            Self::generate_token(&config)?
        };

        let server = Self {
            config,
            python,
            uv,
            process: Arc::new(Mutex::new(None)),
            app_handle,
            token,
            already_started,
        };

        if !server.config.data_dir.exists() {
            std::fs::create_dir_all(&server.config.data_dir).map_err(|err| {
                ServerEnsureError::CreateDataDirFailed {
                    msg: format!(
                        "Failed to create server data directory at {}: {}",
                        server.config.data_dir.display(),
                        err
                    ),
                }
            })?;
        }

        let callback = on_progress.clone();
        server
            .uv
            .update(LATEST_PIP, &requirements, move |progress| {
                callback(ServerEnsureProgress::UpdatingDependencies { progress });
            })
            .map_err(|err| ServerEnsureError::UpdateDependenciesFailed { reason: err })?;

        Ok(server)
    }

    pub fn stop_server(python: &Python, option: &ServerConfig) -> Result<(), String> {
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
            msg
        })?;
        if !output.status.success() {
            let msg = format!(
                "Failed to stop server (process exited with code {}): {}",
                output.status.code().unwrap_or(-1),
                String::from_utf8_lossy(&output.stderr)
            );
            return Err(msg);
        }
        Ok(())
    }

    pub fn read_version(option: &ServerConfig) -> Result<Option<String>, ServerEnsureError> {
        let path = option.data_dir.join("VERSION");
        if !path.exists() {
            return Ok(None);
        }
        match std::fs::read_to_string(&path) {
            Ok(version) => Ok(Some(version)),
            Err(err) => Err(ServerEnsureError::VersionReadFailed {
                msg: format!("Failed to read version file at {}: {}", path.display(), err),
            }),
        }
    }

    fn generate_token(option: &ServerConfig) -> Result<String, ServerEnsureError> {
        let token = generate_token();
        Self::save_token(&token, option)
            .map_err(|err| ServerEnsureError::TokenWriteFailed { msg: err })?;
        Ok(token)
    }

    fn save_token(token: &str, option: &ServerConfig) -> Result<(), String> {
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

    fn read_token(option: &ServerConfig) -> Result<String, String> {
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

    pub fn start(&self) -> Result<(), ServerEnsureError> {
        if self.already_started {
            return Err(ServerEnsureError::AlreadyRunning {
                msg: format!("Server is already running on port {}", self.config.port),
            });
        }
        let mut cmd = self.python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--token");
        cmd.arg(self.token.clone());
        cmd.arg("--port");
        cmd.arg(self.config.port.to_string());
        cmd.arg("--hash");
        cmd.arg(self.config.hash.clone());
        cmd.arg("--dashboard-path");
        let executable = canonicalize(current_exe().unwrap())
            .unwrap()
            .to_string_lossy()
            .to_string();
        info!("Executable: {}", executable);
        cmd.arg(executable);
        cmd.stderr(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.current_dir(&self.config.data_dir);
        info!(
            "Starting server with args: {:?} in {:?}",
            cmd, self.config.data_dir
        );
        let child = cmd.spawn().map_err(|err| ServerEnsureError::StartFailed {
            msg: format!("Failed to start server process: {}", err),
        })?;
        self.handle_io(child).unwrap();
        Ok(())
    }

    fn handle_io(&self, mut child: std::process::Child) -> Result<(), String> {
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        std::thread::spawn(move || {
            std::io::BufReader::new(stdout).lines().for_each(|line| {
                if let Ok(line) = line {
                    info!("{}", line);
                }
            });
        });
        std::thread::spawn(move || {
            std::io::BufReader::new(stderr).lines().for_each(|line| {
                if let Ok(line) = line {
                    info!("{}", line);
                }
            });
        });
        let process = ServerProcess {
            handle: Arc::new(Mutex::new(child)),
        };
        {
            *self.process.lock().unwrap() = Some(process);
        }
        let process = self.process.clone();
        let app_handle = self.app_handle.clone();
        std::thread::spawn(move || {
            let handle = {
                let process = process.lock().unwrap();
                process.as_ref().unwrap().handle.clone()
            };
            let exit = handle.lock().unwrap().wait();
            {
                *process.lock().unwrap() = None;
            }

            match exit {
                Ok(status) => {
                    let code = status.code().unwrap_or(0);
                    if code == RESTART_CODE {
                        info!("Restarting server: {}", code);
                        return;
                    } else if code == 0 {
                        info!("Server exited normally: {}", code);
                        return;
                    }
                    let app_handle = app_handle.lock().unwrap();
                    if let Some(app_handle) = &*app_handle {
                        app_handle
                            .emit(
                                "server_state",
                                ServerState::ServerStopped {
                                    msg: format!("Server exited with code {}", code),
                                },
                            )
                            .unwrap();
                    }
                }
                Err(err) => {
                    warn!("Server process exited with error: {}", err);
                }
            }
        });
        Ok(())
    }

    pub fn is_running(&self) -> bool {
        self.process.lock().unwrap().is_some()
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
