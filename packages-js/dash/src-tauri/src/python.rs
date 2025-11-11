use std::{
    path::{self, PathBuf},
    process::Command,
};

use crate::{
    options::AppOptions,
    sources::py::{get_download_url, PythonVersion},
    sync::{read_venv_marker, write_venv_marker},
    utils::{archive::unpack_archive, checksum::check_checksum, download::download_url},
};

pub struct Python {
    pub version: PythonVersion,
    pub path: PathBuf,
    pub python_bin: PathBuf,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum PythonEnsureError {
    ChecksumFailed { msg: String },
    ExtractFailed { msg: String },
    UnkownVersion { msg: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum PythonEnsureProgress {
    Downloading {
        msg: String,
        progress: f64,
        total: f64,
    },
    Extracting {
        msg: String,
        progress: f64,
        total: f64,
    },
}

impl Python {
    pub fn ensure(
        options: &AppOptions,
        on_progress: impl Fn(PythonEnsureProgress) + Send + Clone + 'static,
    ) -> Result<Self, PythonEnsureError> {
        let python_path = options.get_python_path();
        let python_bin = if cfg!(target_os = "windows") {
            python_path.join("install").join("python.exe")
        } else {
            python_path.join("install").join("bin").join("python")
        };
        if !python_path.exists() {
            return Self::download(&options, &on_progress).map(|version| Self {
                version,
                path: python_path,
                python_bin,
            });
        };
        match read_venv_marker(&python_path) {
            Some(version) => Ok(Self {
                version: version.python,
                path: python_path,
                python_bin: python_bin,
            }),
            None => Self::download(&options, &on_progress).map(|version| Self {
                version,
                path: python_path,
                python_bin,
            }),
        }
    }

    fn download(
        options: &AppOptions,
        on_progress: &(impl Fn(PythonEnsureProgress) + Send + 'static),
    ) -> Result<PythonVersion, PythonEnsureError> {
        let version = &options.python_version;
        let (version, python_url, checksum) =
            get_download_url(&version).ok_or_else(|| PythonEnsureError::UnkownVersion {
                msg: format!("Unknown Python version: {}", version),
            })?;
        let python_dir = options.get_python_path();
        on_progress(PythonEnsureProgress::Downloading {
            msg: format!("Downloading Python {}...", version),
            progress: 0.0,
            total: 0.0,
        });
        let contents = download_url(python_url, |progress, total| {
            on_progress(PythonEnsureProgress::Downloading {
                msg: format!("Downloading Python {}...", version),
                progress,
                total,
            });
        })
        .map_err(|e| PythonEnsureError::UnkownVersion {
            msg: format!("Failed to download Python {}: {}", version, e),
        })?;
        if let Some(checksum) = checksum {
            check_checksum(&contents, &checksum).map_err(|e| {
                PythonEnsureError::ChecksumFailed {
                    msg: format!("Checksum failed for Python {}: {}", version, e),
                }
            })?;
        }
        on_progress(PythonEnsureProgress::Extracting {
            msg: format!("Extracting Python to {}", python_dir.display()),
            progress: 0.0,
            total: 0.0,
        });
        if python_dir.exists() {
            std::fs::remove_dir_all(&python_dir).map_err(|e| PythonEnsureError::ExtractFailed {
                msg: format!(
                    "Failed to remove existing Python directory {}: {}",
                    python_dir.display(),
                    e
                ),
            })?;
        }
        unpack_archive(&contents, &python_dir, 1, |progress, total| {
            on_progress(PythonEnsureProgress::Extracting {
                msg: format!("Extracting Python to {}", python_dir.display()),
                progress,
                total,
            });
        })
        .map_err(|e| PythonEnsureError::ExtractFailed {
            msg: format!(
                "Failed to extract Python to {}: {}",
                python_dir.display(),
                e
            ),
        })?;
        write_venv_marker(&python_dir, &version).unwrap();
        Ok(version)
    }

    pub fn cmd(&self) -> Command {
        let mut command = Command::new(&self.python_bin);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // 0x08000000: CREATE_NO_WINDOW https://learn.microsoft.com/ja-jp/windows/win32/procthread/process-creation-flags?redirectedfrom=MSDN#create_no_window
            command.creation_flags(0x08000000);
        }

        command
    }
}
