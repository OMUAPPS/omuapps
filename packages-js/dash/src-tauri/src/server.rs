use std::fs::canonicalize;
use std::io::{BufRead, Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::Result;
use log::{info, warn};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::utils::platform::current_exe;
use tauri::{AppHandle, Emitter};

use crate::options::AppOptions;
use crate::utils::filesystem::remove_dir_all;
use crate::version::VERSION;

const RESTART_CODE: i32 = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub workdir: PathBuf,
    pub port: u16,
    pub hash: String,
}

impl ServerConfig {
    pub fn ensure(options: &AppOptions) -> Self {
        let path = &options.appdir.join("server.json");
        if path.exists() {
            info!("Loading config from {}", path.display());
            match Self::load(path) {
                Ok(config) => return config,
                Err(err) => {
                    warn!("Failed to load config: {}, generating default config", err);
                }
            };
        } else {
            info!(
                "Config file not found, generating default config at {}",
                path.display()
            );
        }
        let config = ServerConfig {
            workdir: options.workdir.clone(),
            port: 26423,
            hash: generate_hash(),
        };
        config.store(path).unwrap_or_else(|err| {
            warn!("Failed to store default config: {}", err);
        });
        config
    }

    pub fn store(&self, path: &PathBuf) -> Result<(), std::io::Error> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)
    }

    pub fn load(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn get_token_path(&self) -> PathBuf {
        let mut token_path = self.workdir.join("token.txt");
        if cfg!(dev) {
            token_path = std::env::current_dir()
                .unwrap()
                .join("../../../appdata/token.txt");
        }
        return token_path;
    }
}

fn generate_hash() -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    let random_bytes: [u8; 16] = rand::random();
    hasher.update(&random_bytes);
    format!("{:x}", hasher.finalize())
}

pub struct ServerProcess(Arc<Mutex<std::process::Child>>);

pub struct Server {
    config: ServerConfig,
    executable: PathBuf,
    process: Arc<Mutex<Option<ServerProcess>>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    pub token: String,
    pub already_started: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerState {
    ServerStarting { msg: String },
    ServerRestarting { msg: String },
    ServerStopped { msg: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerEnsureProgress {
    ServerStopping { msg: String },
    LegacyRemoving { msg: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum ServerEnsureError {
    StopFailed { msg: String },
    TokenReadFailed { msg: String },
    TokenWriteFailed { msg: String },
    CreateDataDirFailed { msg: String },
    StartFailed { msg: String },
    AlreadyRunning { msg: String },
}

impl Server {
    pub fn executable() -> PathBuf {
        let directory = canonicalize(current_exe().unwrap())
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        directory.join(format!("omuserver{}", std::env::consts::EXE_SUFFIX))
    }

    fn command(executable: &PathBuf, config: &ServerConfig) -> Command {
        let mut command = Command::new(executable);
        command.current_dir(&config.workdir);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        command
    }

    pub fn ensure_server(
        config: &ServerConfig,
        options: &AppOptions,
        on_progress: impl Fn(ServerEnsureProgress) + Send + Sync + Clone + 'static,
        app_handle: Arc<Mutex<Option<AppHandle>>>,
    ) -> Result<Self, ServerEnsureError> {
        let executable = Self::executable();
        let mut already_started = !is_port_free(config.port);

        if already_started {
            let version = fetch_version(config.port);
            if version.as_deref() != Some(VERSION) {
                on_progress(ServerEnsureProgress::ServerStopping {
                    msg: format!(
                        "Server version mismatch ({} != {}), stopping server",
                        version.unwrap_or("none".to_string()),
                        VERSION
                    ),
                });
                Self::stop_server(&executable, &config)
                    .map_err(|err| ServerEnsureError::StopFailed { msg: err })?;
                already_started = false;
            }
        }

        if !already_started {
            Self::remove_legacy(options, &on_progress);
        }

        let token = if already_started {
            Self::read_token(&config)
                .map_err(|err| ServerEnsureError::TokenReadFailed { msg: err })?
        } else {
            Self::generate_token(&config)?
        };

        let server = Self {
            config: config.clone(),
            executable,
            process: Arc::new(Mutex::new(None)),
            app_handle,
            token,
            already_started,
        };

        if !server.config.workdir.exists() {
            std::fs::create_dir_all(&server.config.workdir).map_err(|err| {
                ServerEnsureError::CreateDataDirFailed {
                    msg: format!(
                        "Failed to create server data directory at {}: {}",
                        server.config.workdir.display(),
                        err
                    ),
                }
            })?;
        }

        Ok(server)
    }

    pub fn remove_legacy(options: &AppOptions, on_progress: &impl Fn(ServerEnsureProgress)) {
        for directory in options.legacy_directories() {
            if !directory.exists() {
                continue;
            }
            on_progress(ServerEnsureProgress::LegacyRemoving {
                msg: format!("Removing {}", directory.display()),
            });
            if let Err(err) = remove_dir_all(&directory, |_, _| {}) {
                warn!("Failed to remove {}: {}", directory.display(), err);
            }
        }
    }

    pub fn stop_server(executable: &PathBuf, option: &ServerConfig) -> Result<(), String> {
        Self::run(executable, option, "--stop")
    }

    pub fn uninstall(executable: &PathBuf, option: &ServerConfig) -> Result<(), String> {
        Self::run(executable, option, "--uninstall")
    }

    fn run(executable: &PathBuf, option: &ServerConfig, action: &str) -> Result<(), String> {
        let mut cmd = Self::command(executable, option);
        cmd.arg("--port");
        cmd.arg(option.port.to_string());
        cmd.arg(action);
        cmd.stderr(Stdio::piped());
        cmd.stdout(Stdio::piped());
        info!("Running server with command: {:?}", cmd);
        let output = cmd
            .output()
            .map_err(|err| format!("Failed to run server with command {:?}: {}", cmd, err))?;
        if !output.status.success() {
            warn!(
                "Server command {:?} exited with code {}: {}",
                cmd,
                output.status.code().unwrap_or(-1),
                String::from_utf8_lossy(&output.stderr)
            );
        }
        Ok(())
    }

    fn generate_token(option: &ServerConfig) -> Result<String, ServerEnsureError> {
        let token = generate_token();
        Self::save_token(&token, option)
            .map_err(|err| ServerEnsureError::TokenWriteFailed { msg: err })?;
        Ok(token)
    }

    fn save_token(token: &str, option: &ServerConfig) -> Result<(), String> {
        let token_path = option.get_token_path();
        let parent_dir = token_path.parent().unwrap();
        std::fs::create_dir_all(&parent_dir).map_err(|err| {
            format!(
                "Failed to create token file directory at {}: {}",
                parent_dir.display(),
                err
            )
        })?;
        std::fs::write(token_path.clone(), token).map_err(|err| {
            format!(
                "Failed to write token file at {}: {}",
                token_path.display(),
                err
            )
        })?;
        Ok(())
    }

    fn read_token(option: &ServerConfig) -> Result<String, String> {
        let token_path = option.get_token_path();
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
        let mut cmd = Self::command(&self.executable, &self.config);
        cmd.arg("--token-file").arg(self.config.get_token_path());
        cmd.arg("--port").arg(self.config.port.to_string());
        let hash = if cfg!(dev) {
            &"dev".to_string()
        } else {
            &self.config.hash
        };
        cmd.arg("--hash").arg(&hash);
        let executable = canonicalize(current_exe().unwrap())
            .unwrap()
            .to_string_lossy()
            .to_string();
        info!("Executable: {}", executable);
        cmd.arg("--dashboard-path").arg(executable);
        cmd.stderr(Stdio::piped());
        cmd.stdout(Stdio::piped());
        info!(
            "Starting server with args: {:?} in {:?}",
            cmd, self.config.workdir
        );
        let app_handle = self.app_handle.lock().unwrap().clone();
        if let Some(app) = app_handle {
            let _ = app.emit(
                "server_state",
                ServerState::ServerStarting {
                    msg: format!("Starting server: {:?}", cmd),
                },
            );
        }
        let child = cmd.spawn().map_err(|err| ServerEnsureError::StartFailed {
            msg: format!("Failed to start server process: {}", err),
        })?;
        self.handle_io(child).unwrap();
        Ok(())
    }

    fn handle_io(&self, mut child: std::process::Child) -> Result<(), String> {
        if let Some(stdout) = child.stdout.take() {
            std::thread::spawn(move || {
                std::io::BufReader::new(stdout)
                    .lines()
                    .filter_map(Result::ok)
                    .for_each(|line| info!("{}", line));
            });
        }
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                std::io::BufReader::new(stderr)
                    .lines()
                    .filter_map(Result::ok)
                    .for_each(|line| info!("{}", line));
            });
        }

        let child_arc = Arc::new(Mutex::new(child));
        *self.process.lock().unwrap() = Some(ServerProcess(child_arc.clone()));

        let process_store = self.process.clone();
        let app_handle = self.app_handle.clone();

        std::thread::spawn(move || {
            let exit = child_arc.lock().unwrap().wait();
            *process_store.lock().unwrap() = None;

            let status = match exit {
                Ok(status) => status,
                Err(err) => {
                    warn!("Server process exited with error: {}", err);
                    return;
                }
            };

            let code = status.code().unwrap_or(0);
            let state = match code {
                0 => {
                    info!("Server exited normally: {}", code);
                    None
                }
                RESTART_CODE => {
                    info!("Restarting server: {}", code);
                    Some(ServerState::ServerRestarting {
                        msg: "Server is restarting".to_string(),
                    })
                }
                _ => {
                    info!("Server process exited with code: {}", code);
                    Some(ServerState::ServerStopped {
                        msg: format!("Server exited with code {}", code),
                    })
                }
            };

            if let Some(state) = state {
                let app = app_handle.lock().unwrap().clone();
                if let Some(app) = app {
                    if let Err(err) = app.emit("server_state", state) {
                        warn!("Failed to emit server_state event: {}", err);
                    }
                }
            }
        });

        Ok(())
    }

    pub fn is_running(&self) -> bool {
        self.process.lock().unwrap().is_some()
    }

    pub fn wait_until_ready(&self, timeout: Duration) -> Result<(), ServerEnsureError> {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            if fetch_version(self.config.port).is_some() {
                return Ok(());
            }
            if !self.is_running() {
                return Err(ServerEnsureError::StartFailed {
                    msg: "Server exited before it became ready".to_string(),
                });
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        Err(ServerEnsureError::StartFailed {
            msg: format!("Server did not become ready within {} seconds", timeout.as_secs()),
        })
    }
}

fn generate_token() -> String {
    rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(32)
        .map(char::from)
        .collect::<String>()
}

fn fetch_version(port: u16) -> Option<String> {
    let address = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(3)).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    let request = format!(
        "GET /version HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n",
        port
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let body = response.split("\r\n\r\n").nth(1)?;
    let json: serde_json::Value = serde_json::from_str(body.trim()).ok()?;
    json.get("version")?.as_str().map(|version| version.to_string())
}

fn is_port_free(port: u16) -> bool {
    let ok_127 = std::net::TcpListener::bind(("127.0.0.1", port)).is_ok();
    let ok_0 = std::net::TcpListener::bind(("0.0.0.0", port)).is_ok();
    ok_127 && ok_0
}
