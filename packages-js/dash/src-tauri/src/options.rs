use std::path::PathBuf;

use crate::{server::ServerOption, sources::py::PythonVersionRequest};

#[derive(Debug, Clone)]
pub struct AppOptions {
    pub python_version: PythonVersionRequest,
    pub python_path: PathBuf,
    pub uv_path: PathBuf,
    pub workdir: PathBuf,
    pub server_options: ServerOption,
    pub config_path: PathBuf,
}
