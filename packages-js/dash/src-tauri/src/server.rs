use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use log::info;
use rand::Rng;

use crate::version::VERSION;
use crate::{app::ServerStatus, python::Python, uv::Uv};
const LATEST_PIP: &str = "pip==23.3.2";

pub struct ServerOption {
    pub data_dir: PathBuf,
    pub port: u16,
}

pub struct Server {
    option: ServerOption,
    python: Python,
    uv: Uv,
    pub token: Arc<Mutex<Option<String>>>,
    pub state: Arc<Mutex<ServerStatus>>,
    pub window: Arc<Mutex<Option<tauri::Window>>>,
}

impl Server {
    pub fn new(option: ServerOption, python: Python, uv: Uv) -> Self {
        Self {
            option,
            python,
            uv,
            token: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(ServerStatus::NotInstalled)),
            window: Arc::new(Mutex::new(None)),
        }
    }

    fn change_state(&self, state: ServerStatus) {
        if let Some(window) = self.window.lock().unwrap().as_ref() {
            window
                .emit("server-state", Some(state.clone()))
                .expect("failed to emit server-state");
        } else {
            info!("window not found");
        }
        *self.state.lock().unwrap() = state;
    }

    pub fn is_port_free(&self) -> bool {
        match std::net::TcpListener::bind(("127.0.0.1", self.option.port)) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    fn save_token(&self) {
        let token_path = self.option.data_dir.join("token.txt");
        std::fs::write(token_path, self.token.lock().unwrap().as_ref().unwrap())
            .expect("failed to save token");
    }

    fn load_token(&self) {
        let token_path = self.option.data_dir.join("token.txt");
        if !token_path.exists() {
            return;
        }
        if let Ok(token) = std::fs::read_to_string(token_path) {
            *self.token.lock().unwrap() = Some(token);
        }
    }

    pub fn start(&self) -> Result<(), String> {
        if !self.option.data_dir.exists() {
            std::fs::create_dir_all(&self.option.data_dir).expect("failed to create data_dir");
        }

        if self.is_port_free() {
            self.token.lock().unwrap().replace(generate_token());
            self.save_token();
        } else {
            self.load_token();
            self.change_state(ServerStatus::AlreadyRunning);
            return Ok(());
        }

        info!("Running server on port {}", self.option.port);

        if !self.option.data_dir.exists() {
            std::fs::create_dir_all(&self.option.data_dir).expect("failed to create data_dir");
        }

        self.change_state(ServerStatus::Installing);
        let requirements = format!("omuserver=={}", VERSION);
        self.uv
            .update(LATEST_PIP, &requirements)
            .expect("failed to update uv");
        self.change_state(ServerStatus::Installed);

        let mut cmd = self.python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--token");
        cmd.arg(self.token.lock().unwrap().as_ref().unwrap());
        cmd.arg("--port");
        cmd.arg(self.option.port.to_string());
        cmd.current_dir(&self.option.data_dir);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // 0x08000000: CREATE_NO_WINDOW https://learn.microsoft.com/ja-jp/windows/win32/procthread/process-creation-flags?redirectedfrom=MSDN#create_no_window
            cmd.creation_flags(0x08000000);
        }
        cmd.spawn().expect("failed to spawn server");
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
