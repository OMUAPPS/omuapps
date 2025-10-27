use std::{fs::create_dir_all, path::PathBuf};

use anyhow::{ensure, Result};
use log::{info, warn};
use serde::{Deserialize, Serialize};

use crate::{server::ServerConfig, sources::py::PythonVersionRequest, APP_DIRECTORY};

static PYTHON_VERSION: PythonVersionRequest = PythonVersionRequest {
    name: None,
    arch: None,
    os: None,
    major: 3,
    minor: Some(12),
    patch: Some(3),
    suffix: None,
};

#[derive(Debug, Clone)]
pub struct AppOptions {
    pub python_version: PythonVersionRequest,
    pub python_path: PathBuf,
    pub uv_path: PathBuf,
    pub workdir: PathBuf,
    pub config_path: PathBuf,
}

impl AppOptions {
    pub fn get_python_path(self: &AppOptions) -> PathBuf {
        self.python_path.join(self.python_version.to_string())
    }

    pub fn ensure() -> Result<Self> {
        let data_dir = get_data_dir();
        let bin_dir = APP_DIRECTORY.data_local_dir();
        create_dir_all(&data_dir)?;
        create_dir_all(&bin_dir)?;

        ensure!(
            bin_dir.exists(),
            "Failed to create bin directory: {}",
            bin_dir.display(),
        );
        ensure!(
            data_dir.exists(),
            "Failed to create data directory: {}",
            data_dir.display(),
        );

        let options = Self {
            python_version: PYTHON_VERSION.clone(),
            python_path: bin_dir.join("python"),
            uv_path: bin_dir.join("uv"),
            workdir: data_dir.clone(),
            config_path: bin_dir.join("config.json"),
        };
        Ok(options)
    }

    pub fn get_log_dir(&self) -> PathBuf {
        // <workdir>/logs/<year>-<month>-<day>
        let now = chrono::Local::now();
        self.workdir
            .join("logs")
            .join(now.format("%Y-%m-%d").to_string())
    }
}

fn get_data_dir() -> std::path::PathBuf {
    if cfg!(dev) {
        let path = std::env::current_dir().unwrap();
        let path = path.join("appdata");
        return path;
    }
    return APP_DIRECTORY.data_dir().to_path_buf();
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppConfig {
    pub enable_beta: bool,
    pub server: ServerConfig,
}

impl AppConfig {
    pub fn ensure(options: &AppOptions) -> Self {
        let path = &options.config_path;
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
        let config = AppConfig {
            enable_beta: false,
            server: ServerConfig::create(&options),
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
}
