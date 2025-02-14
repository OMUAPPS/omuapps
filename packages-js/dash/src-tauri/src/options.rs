use std::{fs::create_dir_all, path::PathBuf};

use anyhow::{ensure, Ok, Result};
use serde::{Deserialize, Serialize};

use crate::{server::ServerOption, sources::py::PythonVersionRequest, APP_DIRECTORY};

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
    pub server_options: ServerOption,
    pub config_path: PathBuf,
}

impl AppOptions {
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
            server_options: ServerOption {
                data_dir: data_dir.clone(),
                port: 26423,
            },
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
        let path = path.join("../../../appdata");
        return path;
    }
    return APP_DIRECTORY.data_dir().to_path_buf();
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DashboardOptions {
    pub enable_beta: bool,
}

impl Default for DashboardOptions {
    fn default() -> Self {
        Self { enable_beta: false }
    }
}

impl DashboardOptions {
    pub fn ensure(path: &PathBuf) -> Self {
        if !path.exists() {
            let config = DashboardOptions::default();
            config.store(path).unwrap();
            config
        } else {
            DashboardOptions::load(path).unwrap()
        }
    }

    pub fn store(&self, path: &PathBuf) -> Result<(), std::io::Error> {
        let content = serde_json::to_string_pretty(self).unwrap();
        std::fs::write(path, content)
    }

    pub fn load(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = serde_json::from_str(&content)?;
        Ok(config)
    }
}
