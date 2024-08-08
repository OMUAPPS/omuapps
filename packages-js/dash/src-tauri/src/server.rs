use std::path::PathBuf;

use anyhow::Result;
use log::info;
use rand::Rng;

use crate::version::VERSION;
use crate::{python::Python, uv::Uv};
const LATEST_PIP: &str = "pip==23.3.2";

#[derive(Debug, Clone)]
pub struct ServerOption {
    pub data_dir: PathBuf,
    pub port: u16,
}

pub enum InstallProgress {
    Installing,
    Installed,
}

pub struct Server {
    option: ServerOption,
    python: Python,
    uv: Uv,
    on_progress: Option<Box<dyn Fn(InstallProgress) + Send>>,
    pub token: String,
}

impl Server {
    pub fn ensure_server(option: ServerOption, python: Python, uv: Uv) -> Result<Self, String> {
        let token = if is_port_available("127.0.0.1", option.port) {
            let token = generate_token();
            Self::save_token(&token, &option);
            token
        } else {
            Self::read_token_file(&option)?
        };

        Ok(Self {
            option,
            python,
            uv,
            token,
            on_progress: None,
        })
    }

    fn save_token(token: &str, option: &ServerOption) {
        let token_path = option.data_dir.join("token.txt");
        std::fs::write(token_path, token).expect("failed to save token");
    }

    fn read_token_file(option: &ServerOption) -> Result<String, String> {
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

    pub fn start(&self) -> Result<(), String> {
        if !self.option.data_dir.exists() {
            std::fs::create_dir_all(&self.option.data_dir).expect("failed to create data_dir");
        }

        info!("Running server on port {}", self.option.port);

        if !self.option.data_dir.exists() {
            std::fs::create_dir_all(&self.option.data_dir).expect("failed to create data_dir");
        }

        let requirements = format!("omuserver=={}", VERSION);
        self.uv
            .update(LATEST_PIP, &requirements)
            .expect("failed to update uv");

        let mut cmd = self.python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--token");
        cmd.arg(self.token.clone());
        cmd.arg("--port");
        cmd.arg(self.option.port.to_string());
        cmd.current_dir(&self.option.data_dir);
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

fn is_port_available(host: &str, port: u16) -> bool {
    match std::net::TcpListener::bind((host, port)) {
        Ok(_) => true,
        Err(_) => false,
    }
}
