use anyhow::Result;
use std::path::Path;

pub fn remove_dir_all<F, P: AsRef<Path>>(path: P, on_progress: F) -> Result<()>
where
    F: Fn(f64, f64),
{
    let path = path.as_ref();
    if !path.exists() {
        return Ok(());
    }
    let total = walkdir::WalkDir::new(path).into_iter().count() as f64;
    let step = (total / 100.0 * 5.0).max(1.0).ceil() as usize;
    let mut current = 0;
    for entry in walkdir::WalkDir::new(path) {
        if current % step == 0 {
            on_progress(current as f64, total);
        }
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && path.exists() {
            std::fs::remove_file(path).map_err(|err| {
                anyhow::anyhow!("Failed to remove file {}: {}", path.display(), err)
            })?;
        }
        current += 1;
    }
    if path.exists() {
        std::fs::remove_dir_all(path).map_err(|err| {
            anyhow::anyhow!("Failed to remove directory {}: {}", path.display(), err)
        })?;
    }
    Ok(())
}
