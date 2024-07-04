use std::{path::PathBuf, process::Command};

use anyhow::{anyhow, bail, Error};
use log::info;

use crate::{
    options::InstallOptions,
    sources::py::{get_download_url, PythonVersion},
    sync::{read_venv_marker, write_venv_marker},
    utils::{checksum::check_checksum, download::download_url, extract::unpack_archive},
};

pub struct Python {
    pub version: PythonVersion,
    pub path: PathBuf,
    pub python_bin: PathBuf,
}

impl Python {
    pub fn ensure(options: &InstallOptions) -> Result<Self, Error> {
        let python_path = get_dir(&options);
        let python_bin = if cfg!(target_os = "windows") {
            python_path.join("install").join("python.exe")
        } else {
            python_path.join("install").join("bin").join("python")
        };
        if python_path.exists() {
            match read_venv_marker(&python_path) {
                Some(version) => Ok(Self {
                    version: version.python,
                    path: python_path,
                    python_bin: python_bin,
                }),
                None => Self::download(&options).map(|version| Self {
                    version,
                    path: python_path,
                    python_bin,
                }),
            }
        } else {
            Self::download(&options).map(|version| Self {
                version,
                path: python_path,
                python_bin,
            })
        }
    }

    fn download(options: &InstallOptions) -> Result<PythonVersion, Error> {
        let version = &options.python_version;
        let (version, python_url, checksum) = match get_download_url(&version) {
            Some(result) => result,
            None => bail!("unknown version {}", version),
        };
        let python_dir = get_dir(options);
        info!("Downloading Python from {}", python_url);
        let contents = download_url(python_url).unwrap();
        if let Some(checksum) = checksum {
            check_checksum(&contents, &checksum).map_err(|_| anyhow!("checksum mismatch"))?;
        }
        info!("Downloaded Python to {}", contents.len());
        unpack_archive(&contents, &python_dir, 1).unwrap();
        write_venv_marker(&python_dir, &version).unwrap();
        Ok(version)
    }

    pub fn cmd(&self) -> Command {
        let command = Command::new(&self.python_bin);
        command
    }
}

fn get_dir(options: &InstallOptions) -> PathBuf {
    options.python_path.join(options.python_version.to_string())
}
