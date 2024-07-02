use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

use anyhow::Result;

use crate::lock::Lock;
use crate::version::VERSION;
use crate::{app::ServerStatus, python::Python, uv::Uv};
const LATEST_PIP: &str = "pip==23.3.2";

pub struct ServerOption {
    pub data_dir: PathBuf,
    pub lock_file: PathBuf,
    pub port: u16,
}

pub struct Server {
    option: ServerOption,
    python: Python,
    uv: Uv,
    pub token: Arc<Mutex<Option<String>>>,
    pub child: Arc<Mutex<Option<std::process::Child>>>,
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
            child: Arc::new(Mutex::new(None)),
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
            println!("window not found");
        }
        *self.state.lock().unwrap() = state;
    }

    pub fn start(&self) -> Result<(), String> {
        let (is_locked, mut lock) =
            Lock::ensure(&self.option.lock_file).map_err(|e| e.to_string())?;

        self.token.lock().unwrap().get_or_insert(lock.token.clone());

        if is_locked {
            println!("Server is already running");
            println!("Server is already running with token {}", lock.token);
            self.change_state(ServerStatus::AlreadyRunning);
            return Ok(());
        }
        lock.save(self.option.lock_file.clone())
            .map_err(|e| e.to_string())?;

        println!("Running server on port {}", self.option.port);

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

        let child = cmd.spawn().expect("failed to start server");
        lock.set_pid(child.id());
        lock.save(self.option.lock_file.clone())?;
        *self.child.lock().unwrap() = Some(child);
        Ok(())
    }
}
