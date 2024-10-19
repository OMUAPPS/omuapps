#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum Progress {
    PythonDownloading {
        msg: String,
        progress: f64,
        total: f64,
    },
    PythonUnkownVersion {
        msg: String,
    },
    PythonChecksumFailed {
        msg: String,
    },
    PythonExtracting {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvDownloading {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvExtracting {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvCleanupOldVersions {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvCleanupOldVersionsFailed {
        msg: String,
    },
    UvUpdatePip {
        msg: String,
    },
    UvUpdatePipFailed {
        msg: String,
    },
    UvUpdateRequirements {
        msg: String,
    },
    UvUpdateRequirementsFailed {
        msg: String,
    },
    ServerTokenReadFailed {
        msg: String,
    },
    ServerTokenWriteFailed {
        msg: String,
    },
    ServerCreateDataDirFailed {
        msg: String,
    },
    ServerStopping {
        msg: String,
    },
    ServerStopFailed {
        msg: String,
    },
    ServerStarting {
        msg: String,
    },
    ServerStartFailed {
        msg: String,
    },
    ServerAlreadyStarted {
        msg: String,
    },
    PythonRemoving {
        msg: String,
        progress: f64,
        total: f64,
    },
    UvRemoving {
        msg: String,
        progress: f64,
        total: f64,
    },
}
