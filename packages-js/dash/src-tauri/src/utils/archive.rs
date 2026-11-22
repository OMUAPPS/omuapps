use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use anyhow::Error;

pub fn pack_archive(source: &PathBuf, dest: &Path) -> Result<(), Error> {
    // compress the source directory into a .tar.gz file
    let mut tarball = tar::Builder::new(Vec::new());
    tarball.append_dir_all("", source)?;
    let tarball = tarball.into_inner()?;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(&tarball.as_slice())?;
    let tarball = encoder.finish()?;
    fs::write(dest, tarball)?;
    Ok(())
}
