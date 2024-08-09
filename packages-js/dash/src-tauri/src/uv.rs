// https://github.com/astral-sh/rye/blob/main/rye/src/uv.rs - MIT licensed
use std::{
    fs::remove_dir_all,
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::{bail, Error};
use anyhow::{Context, Result};
use std::io::Write;
use tempfile::NamedTempFile;

use crate::{
    options::AppOptions,
    progress::Progress,
    sources::uv::{UvDownload, UvRequest},
    utils::{download::download_url, extract::unpack_archive},
};

pub struct Uv {
    uv_bin: PathBuf,
    workdir: PathBuf,
    python_bin: PathBuf,
}

impl Uv {
    pub fn ensure(
        options: &AppOptions,
        python_bin: &PathBuf,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<Self, Error> {
        let download = UvDownload::try_from(UvRequest::default())?;
        let uv_dir = options.uv_path.join(download.version());
        let uv_bin = if cfg!(target_os = "windows") {
            let mut bin = uv_dir.join("uv");
            bin.set_extension("exe");
            bin
        } else {
            uv_dir.join("uv")
        };
        if uv_dir.exists() && uv_bin.exists() {
            return Ok(Uv {
                uv_bin,
                workdir: options.workdir.clone(),
                python_bin: python_bin.clone(),
            });
        }

        Self::download(options, on_progress)?;
        Self::cleanup_old_versions(&options.uv_path, &uv_dir, on_progress)?;
        if uv_dir.exists() && uv_bin.exists() {
            return Ok(Uv {
                uv_bin,
                workdir: options.workdir.clone(),
                python_bin: python_bin.clone(),
            });
        }

        bail!("Failed to download uv")
    }
    fn cleanup_old_versions(
        base_dir: &Path,
        current_version: &Path,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<(), Error> {
        let versions = base_dir
            .read_dir()?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .filter(|entry| entry.path() != current_version);

        for entry in versions {
            on_progress(Progress::UvCleanupOldVersions(format!(
                "Removing old uv version: {}",
                entry.path().display()
            )));
            if let Err(e) = remove_dir_all(entry.path()) {
                on_progress(Progress::UvCleanupOldVersionsFailed(format!(
                    "Failed to remove old uv version: {}",
                    e
                )));
            }
        }
        Ok(())
    }

    pub fn download(
        options: &AppOptions,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<(), Error> {
        let uv_request = UvRequest::default();
        let uv_download = UvDownload::try_from(uv_request).unwrap();
        let uv_url = uv_download.url.as_ref();
        on_progress(Progress::UvDownloading(format!(
            "Downloading uv from {}",
            uv_url
        )));
        let contents = download_url(&uv_url).unwrap();
        on_progress(Progress::UvExtracting(format!(
            "Extracting uv to {}",
            options.uv_path.display()
        )));
        let dst = options.uv_path.join(uv_download.version());
        let strip = if cfg!(target_os = "windows") { 0 } else { 1 };
        unpack_archive(&contents, &dst, strip).unwrap();
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
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<(), Error> {
        self.update_pip(pip_version, on_progress)?;
        self.update_requirements(requirements, on_progress)?;
        Ok(())
    }

    /// Updates the pip version in the venv.
    pub fn update_pip(
        &self,
        pip_version: &str,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<(), Error> {
        on_progress(Progress::UvUpdatePip(format!(
            "Updating pip to {} at {}",
            pip_version,
            self.workdir.display()
        )));
        let output = self
            .cmd()
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg(pip_version)
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .output()
            .with_context(|| {
                let message = format!(
                    "unable to update pip to {} at {}",
                    pip_version,
                    self.workdir.display()
                );
                on_progress(Progress::UvUpdatePipFailed(message.clone()));
                message
            })?;

        if !output.status.success() {
            let update_error_message = format!(
                "Failed to update pip to {} at {}: {}",
                pip_version,
                self.workdir.display(),
                String::from_utf8_lossy(&output.stderr)
            );
            on_progress(Progress::UvUpdatePipFailed(update_error_message.clone()));
            bail!(update_error_message.clone());
        }
        Ok(())
    }

    /// Updates the requirements in the venv.
    pub fn update_requirements(
        &self,
        requirements: &str,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<(), Error> {
        on_progress(Progress::UvUpdateRequirements(format!(
            "Updating requirements {} at {}",
            requirements,
            self.workdir.display()
        )));

        let mut req_file = NamedTempFile::new()?;
        writeln!(req_file, "{}", requirements)?;

        let output = self
            .cmd()
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg("-r")
            .arg(req_file.path())
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .output()
            .with_context(|| {
                let message = format!(
                    "unable to update requirements at {}",
                    self.workdir.display()
                );
                on_progress(Progress::UvUpdateRequirementsFailed(message.clone()));
                message
            })?;

        if !output.status.success() {
            let update_error_message = format!(
                "Failed to update requirements at {}: {}",
                self.workdir.display(),
                String::from_utf8_lossy(&output.stderr)
            );
            on_progress(Progress::UvUpdateRequirementsFailed(
                update_error_message.clone(),
            ));
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
