// https://github.com/astral-sh/rye/blob/main/rye/src/uv.rs - MIT licensed
use std::{
    fs::remove_dir_all,
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::Context;
use anyhow::{bail, Error};
use std::io::Write;
use tempfile::NamedTempFile;

use crate::{
    options::InstallOptions,
    python::Python,
    sources::uv::{UvDownload, UvRequest},
    utils::{download::download_url, extract::unpack_archive},
};

pub struct Uv {
    uv_bin: PathBuf,
    workdir: PathBuf,
    python_bin: PathBuf,
}

impl Uv {
    pub fn ensure(options: &InstallOptions, python_bin: &PathBuf) -> Result<Self, Error> {
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

        Self::download(options)?;
        Self::cleanup_old_versions(&options.uv_path, &uv_dir)?;
        if uv_dir.exists() && uv_bin.exists() {
            return Ok(Uv {
                uv_bin,
                workdir: options.workdir.clone(),
                python_bin: python_bin.clone(),
            });
        }

        bail!("Failed to download uv")
    }
    fn cleanup_old_versions(base_dir: &Path, current_version: &Path) -> Result<(), Error> {
        let versions = base_dir
            .read_dir()?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .filter(|entry| entry.path() != current_version);

        for entry in versions {
            if let Err(e) = remove_dir_all(entry.path()) {
                println!("Failed to remove old uv version: {}", e);
            }
        }
        Ok(())
    }

    pub fn download(options: &InstallOptions) -> Result<(), Error> {
        let uv_request = UvRequest::default();
        let uv_download = UvDownload::try_from(uv_request).unwrap();
        let uv_url = uv_download.url.as_ref();
        println!("Downloading uv from {}", uv_url);
        let contents = download_url(&uv_url).unwrap();
        println!("Downloaded uv to {}", contents.len());
        let dst = options.uv_path.join(uv_download.version());
        unpack_archive(&contents, &dst, 0).unwrap();
        Ok(())
    }

    pub fn cmd(&self) -> Command {
        let mut cmd = Command::new(&self.uv_bin);
        cmd.current_dir(&self.workdir);
        cmd.env("PROJECT_ROOT", make_project_root_fragment(&self.workdir));
        cmd
    }

    /// Updates the venv to the given pip version and requirements.
    pub fn update(&self, pip_version: &str, requirements: &str) -> Result<(), Error> {
        self.update_pip(pip_version)?;
        self.update_requirements(requirements)?;
        Ok(())
    }

    /// Updates the pip version in the venv.
    pub fn update_pip(&self, pip_version: &str) -> Result<(), Error> {
        self.cmd()
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg(pip_version)
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .status()
            .with_context(|| format!("unable to update pip at {}", self.workdir.display()))?;

        Ok(())
    }

    /// Updates the requirements in the venv.
    pub fn update_requirements(&self, requirements: &str) -> Result<(), Error> {
        let mut req_file = NamedTempFile::new()?;
        writeln!(req_file, "{}", requirements)?;

        self.cmd()
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg("-r")
            .arg(req_file.path())
            .arg("--python")
            .arg(make_project_root_fragment(&self.python_bin))
            .status()
            .with_context(|| {
                format!(
                    "unable to update requirements at {}",
                    self.workdir.display()
                )
            })?;

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
