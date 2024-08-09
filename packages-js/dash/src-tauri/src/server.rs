use std::path::PathBuf;

use anyhow::Result;
use log::info;
use rand::Rng;

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
    pub token: String,
}

impl Server {
    pub fn ensure_server(
        option: ServerOption,
        python: Python,
        uv: Uv,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<Self, String> {
        let token = match Self::get_token(&option, on_progress) {
            Ok(value) => value,
            Err(value) => return value,
        };

        let server = Self {
            option,
            python,
            uv,
            token,
        };

        if !server.option.data_dir.exists() {
            std::fs::create_dir_all(&server.option.data_dir).map_err(|err| {
                format!(
                    "Failed to create data directory at {}: {}",
                    server.option.data_dir.display(),
                    err
                )
            })?;
        }

        let requirements = format!("omuserver=={}", VERSION);
        server
            .uv
            .update(LATEST_PIP, &requirements, on_progress)
            .map_err(|err| err.to_string())?;

        Ok(server)
    }

    fn get_token(
        option: &ServerOption,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<String, std::result::Result<Server, String>> {
        let token = if is_port_available("127.0.0.1", option.port) {
            let token = generate_token();
            match Self::save_token(&token, option) {
                Ok(_) => token,
                Err(err) => {
                    on_progress(Progress::ServerTokenWriteFailed(err.clone()));
                    return Err(Err(err));
                }
            }
        } else {
            match Self::read_token_file(option) {
                Ok(token) => token,
                Err(err) => {
                    on_progress(Progress::ServerTokenReadFailed(err.clone()));
                    return Err(Err(err));
                }
            }
        };
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
        let mut cmd = self.python.cmd();
        cmd.arg("-m");
        cmd.arg("omuserver");
        cmd.arg("--token");
        cmd.arg(self.token.clone());
        cmd.arg("--port");
        cmd.arg(self.option.port.to_string());
        cmd.current_dir(&self.option.data_dir);
        let child = cmd.spawn().map_err(|err| err.to_string())?;
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
