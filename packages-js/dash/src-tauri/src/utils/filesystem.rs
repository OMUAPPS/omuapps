use anyhow::Error;
use std::path::Path;

pub fn remove_dir_all<F, P: AsRef<Path>>(path: P, on_progress: F) -> Result<(), Error>
where
    F: Fn(f64, f64),
{
    let path = path.as_ref();
    let total = walkdir::WalkDir::new(path).into_iter().count() as f64;
    let mut current = 0;
    for entry in walkdir::WalkDir::new(path) {
        let entry = entry?;
        if entry.path().is_dir() {
            std::fs::remove_dir_all(entry.path())?;
        } else {
            std::fs::remove_file(entry.path())?;
        }
        current += 1;
        on_progress(current as f64, total);
    }
    Ok(())
}
