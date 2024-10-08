#[derive(Debug, Clone, serde::Serialize)]
pub enum Progress {
    PythonDownloading(String),
    PythonUnkownVersion(String),
    PythonChecksumFailed(String),
    PythonExtracting(String),
    UvDownloading(String),
    UvExtracting(String),
    UvCleanupOldVersions(String),
    UvCleanupOldVersionsFailed(String),
    UvUpdatePip(String),
    UvUpdatePipFailed(String),
    UvUpdateRequirements(String),
    UvUpdateRequirementsFailed(String),
    ServerTokenReadFailed(String),
    ServerTokenWriteFailed(String),
    ServerCreateDataDirFailed(String),
    ServerStoppping(String),
    ServerStopFailed(String),
    ServerStarting(String),
    ServerStartFailed(String),
    ServerAlreadyStarted(String),
}
