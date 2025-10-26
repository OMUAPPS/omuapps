// https://github.com/astral-sh/rye/blob/main/rye/src/uv.rs - MIT licensed
use std::{
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::Result;
use log::debug;
use std::io::Write;
use tempfile::NamedTempFile;

use crate::{
    options::AppOptions,
    sources::uv::{UvDownload, UvRequest},
    utils::{archive::unpack_archive, download::download_url, filesystem::remove_dir_all},
};

pub struct Uv {
    uv_bin: PathBuf,
    workdir: PathBuf,
    python_bin: PathBuf,
    index_url: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UvEnsureProgress {
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
    UvCleanupOldVersions {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvUpdatePip {
        msg: String,
    },
    UpdateRequirements {
        msg: String,
    },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum UvEnsureError {
    CleanupOldVersionsFailed { msg: String },
    UpdatePipFailed { msg: String },
    UpdateRequirementsFailed { msg: String },
    NoDownloadFound { msg: String },
}

impl Uv {
    pub fn ensure(
        options: &AppOptions,
        python_bin: &PathBuf,
        on_progress: impl Fn(UvEnsureProgress) + Send + Clone + 'static,
    ) -> Result<Self, UvEnsureError> {
        let download = UvDownload::try_from(UvRequest::default()).map_err(|err| {
            UvEnsureError::NoDownloadFound {
                msg: format!("No uv download found: {}", err),
            }
        })?;
        let uv_dir = options.uv_path.join(download.version());
        let uv_bin = if cfg!(target_os = "windows") {
            let mut bin = uv_dir.join("uv");
            bin.set_extension("exe");
            bin
        } else {
            uv_dir.join("uv")
        };
        let index_url = if cfg!(dev) {
            "http://localhost:26410/simple/".to_string()
        } else {
            "https://pypi.org/simple/".to_string()
        };
        if uv_dir.exists() && uv_bin.exists() {
            return Ok(Uv {
                uv_bin,
                workdir: options.workdir.clone(),
                python_bin: python_bin.clone(),
                index_url,
            });
        }

        Self::download(options, &on_progress)?;
        Self::cleanup_old_versions(&options.uv_path, &uv_dir, &on_progress)?;
        if uv_dir.exists() && uv_bin.exists() {
            return Ok(Uv {
                uv_bin,
                workdir: options.workdir.clone(),
                python_bin: python_bin.clone(),
                index_url,
            });
        }
        Err(UvEnsureError::NoDownloadFound {
            msg: format!("uv not found after installation at {}", uv_dir.display()),
        })
    }
    fn cleanup_old_versions(
        base_dir: &Path,
        current_version: &Path,
        on_progress: &(impl Fn(UvEnsureProgress) + Send + 'static),
    ) -> Result<(), UvEnsureError> {
        let versions = base_dir
            .read_dir()
            .map_err(|err| UvEnsureError::CleanupOldVersionsFailed {
                msg: format!(
                    "Failed to read uv versions directory {}: {}",
                    base_dir.display(),
                    err
                ),
            })?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .filter(|entry| entry.path() != current_version);

        for entry in versions {
            on_progress(UvEnsureProgress::UvCleanupOldVersions {
                msg: format!("Removing old uv version: {}", entry.path().display()),
                progress: 0.0,
                total: 0.0,
            });
            remove_dir_all(&entry.path(), |progress, total| {
                on_progress(UvEnsureProgress::UvCleanupOldVersions {
                    msg: format!("Removing old uv version: {}", entry.path().display()),
                    progress,
                    total,
                });
            })
            .map_err(|err| UvEnsureError::CleanupOldVersionsFailed {
                msg: format!(
                    "Failed to remove old uv version {}: {}",
                    entry.path().display(),
                    err
                ),
            })?;
        }
        Ok(())
    }

    pub fn download(
        options: &AppOptions,
        on_progress: &(impl Fn(UvEnsureProgress) + Send + 'static),
    ) -> Result<(), UvEnsureError> {
        let uv_request = UvRequest::default();
        let uv_download = UvDownload::try_from(uv_request).unwrap();
        let uv_url = uv_download.url.as_ref();
        on_progress(UvEnsureProgress::Downloading {
            msg: format!("Downloading uv from {}", uv_url),
            progress: 0.0,
            total: 0.0,
        });
        let contents = download_url(&uv_url, |progress, total| {
            on_progress(UvEnsureProgress::Downloading {
                msg: format!("Downloading uv from {}", uv_url),
                progress,
                total,
            });
        })
        .map_err(|err| UvEnsureError::NoDownloadFound {
            msg: format!("Failed to download uv from {}: {}", uv_url, err),
        })?;
        on_progress(UvEnsureProgress::Extracting {
            msg: format!("Extracting uv to {}", options.uv_path.display()),
            progress: 0.0,
            total: 0.0,
        });
        let dst = options.uv_path.join(uv_download.version());
        let strip = if cfg!(target_os = "windows") { 0 } else { 1 };
        unpack_archive(&contents, &dst, strip, |progress, total| {
            on_progress(UvEnsureProgress::Extracting {
                msg: format!("Extracting uv to {}", options.uv_path.display()),
                progress,
                total,
            });
        })
        .map_err(|err| UvEnsureError::NoDownloadFound {
            msg: format!(
                "Failed to extract uv to {}: {}",
                options.uv_path.display(),
                err
            ),
        })?;
        Ok(())
    }

    pub fn cmd(&self) -> Command {
        let mut cmd = Command::new(&self.uv_bin);
        cmd.current_dir(&self.workdir);
        cmd.env("PROJECT_ROOT", make_project_root_fragment(&self.workdir));

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // 0x08000000: CREATE_NO_WINDOW https://learn.microsoft.com/ja-jp/windows/win32/procthread/process-creation-flags?redirectedfrom=MSDN#create_no_window
            cmd.creation_flags(0x08000000);
        }

        cmd
    }

    /// Updates the venv to the given pip version and requirements.
    pub fn update(
        &self,
        pip_version: &str,
        requirements: &str,
        on_progress: impl Fn(UvEnsureProgress) + Send + Clone + 'static,
    ) -> Result<(), UvEnsureError> {
        self.update_pip(pip_version, &on_progress)?;
        self.update_requirements(requirements, &on_progress)?;
        Ok(())
    }

    /// Updates the pip version in the venv.
    pub fn update_pip(
        &self,
        pip_version: &str,
        on_progress: &(impl Fn(UvEnsureProgress) + Send + 'static),
    ) -> Result<(), UvEnsureError> {
        on_progress(UvEnsureProgress::UvUpdatePip {
            msg: format!(
                "Updating pip to {} at {}",
                pip_version,
                self.workdir.display()
            ),
        });
        let output = self
            .cmd()
            .arg("pip")
            .arg("install")
            .arg(pip_version)
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .output()
            .map_err(|err| UvEnsureError::UpdatePipFailed {
                msg: format!(
                    "unable to update pip to {} at {}: {}",
                    pip_version,
                    self.workdir.display(),
                    err
                ),
            })?;

        if !output.status.success() {
            let update_error_message = format!(
                "Failed to update pip to {} at {}: {}",
                pip_version,
                self.workdir.display(),
                String::from_utf8_lossy(&output.stderr)
            );
            on_progress(UvEnsureProgress::UvUpdatePip {
                msg: update_error_message.clone(),
            });
            return Err(UvEnsureError::UpdatePipFailed {
                msg: update_error_message.clone(),
            });
        }
        Ok(())
    }

    /// Updates the requirements in the venv.
    pub fn update_requirements(
        &self,
        requirements: &str,
        on_progress: &(impl Fn(UvEnsureProgress) + Send + 'static),
    ) -> Result<(), UvEnsureError> {
        debug!("Package Index URL: {}", self.index_url);
        on_progress(UvEnsureProgress::UpdateRequirements {
            msg: format!(
                "Updating requirements {} at {}",
                requirements,
                self.workdir.display()
            ),
        });

        let mut req_file =
            NamedTempFile::new().map_err(|err| UvEnsureError::UpdateRequirementsFailed {
                msg: format!(
                    "unable to create temporary requirements file at {}: {}",
                    self.workdir.display(),
                    err
                ),
            })?;
        writeln!(req_file, "{}", requirements).map_err(|err| {
            UvEnsureError::UpdateRequirementsFailed {
                msg: format!(
                    "unable to write to temporary requirements file at {}: {}",
                    self.workdir.display(),
                    err
                ),
            }
        })?;

        let output = self
            .cmd()
            .arg("pip")
            .arg("install")
            .arg("-r")
            .arg(req_file.path())
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .arg("--index-url")
            .arg(&self.index_url)
            .output()
            .map_err(|err| UvEnsureError::UpdateRequirementsFailed {
                msg: format!(
                    "unable to update requirements at {}: {}",
                    self.workdir.display(),
                    err
                ),
            })?;

        if !output.status.success() {
            Err(UvEnsureError::UpdateRequirementsFailed {
                msg: format!(
                    "Failed to update requirements at {}: {}",
                    self.workdir.display(),
                    String::from_utf8_lossy(&output.stderr)
                ),
            })?;
        }

        Ok(())
    }
}

pub fn make_project_root_fragment(root: &Path) -> String {
    // XXX: ${PROJECT_ROOT} is supposed to be used in the context of file:///
    // so let's make sure it is url escaped.  This is pretty hacky but
    // good enough for now.
    // No leading slash to fit with file:///${PROJECT_ROOT} convention
    root.to_string_lossy()
        .trim_start_matches('/')
        .replace(' ', "%20")
}
