use std::{path::PathBuf, process::Command};

use anyhow::{anyhow, bail, Error};

use crate::{
    options::AppOptions,
    progress::Progress,
    sources::py::{get_download_url, PythonVersion},
    sync::{read_venv_marker, write_venv_marker},
    utils::{archive::unpack_archive, checksum::check_checksum, download::download_url},
};

pub struct Python {
    pub version: PythonVersion,
    pub path: PathBuf,
    pub python_bin: PathBuf,
}

impl Python {
    pub fn ensure(
        options: &AppOptions,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<Self, Error> {
        let python_path = get_python_directory(&options);
        let python_bin = if cfg!(target_os = "windows") {
            python_path.join("install").join("python.exe")
        } else {
            python_path.join("install").join("bin").join("python")
        };
        if !python_path.exists() {
            return Self::download(&options, on_progress).map(|version| Self {
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
            None => Self::download(&options, on_progress).map(|version| Self {
                version,
                path: python_path,
                python_bin,
            }),
        }
    }

    fn download(
        options: &AppOptions,
        on_progress: &(impl Fn(Progress) + Send + 'static),
    ) -> Result<PythonVersion, Error> {
        let version = &options.python_version;
        let (version, python_url, checksum) = match get_download_url(&version) {
            Some(result) => result,
            None => {
                on_progress(Progress::PythonUnkownVersion(format!(
                    "Unknown Python version: {}",
                    version
                )));
                bail!("Unknown Python version: {}", version);
            }
        };
        let python_dir = get_python_directory(options);
        on_progress(Progress::PythonDownloading(format!(
            "Downloading Python {} from {}",
            version, python_url
        )));
        let contents = download_url(python_url).unwrap();
        if let Some(checksum) = checksum {
            check_checksum(&contents, &checksum).map_err(|e| {
                on_progress(Progress::PythonChecksumFailed(format!(
                    "Checksum failed for Python {}: {}",
                    version, e
                )));
                anyhow!("Checksum failed for Python {}: {}", version, e)
            })?;
        }
        on_progress(Progress::PythonExtracting(format!(
            "Extracting Python to {}",
            python_dir.display(),
        )));
        unpack_archive(&contents, &python_dir, 1).unwrap();
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

fn get_python_directory(options: &AppOptions) -> PathBuf {
    options.python_path.join(options.python_version.to_string())
}
