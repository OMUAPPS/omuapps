// https://github.com/astral-sh/rye/blob/ab8d5b433d5c4342c2bb125583c6bff4d29f5fbc/rye/src/utils/mod.rs#L290-L352 - MIT License
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::{fmt, fs};

use anyhow::{anyhow, Context, Error};

pub trait IoPathContext {
    type Out;

    /// Adds path information to an error.
    fn path_context<P: AsRef<Path>, D: fmt::Display>(self, p: P, msg: D) -> Self::Out;
}

impl<T, E: std::error::Error + Send + Sync + 'static> IoPathContext for Result<T, E> {
    type Out = Result<T, Error>;

    fn path_context<P: AsRef<Path>, D: fmt::Display>(self, p: P, msg: D) -> Self::Out {
        self.with_context(|| format!("{} (at '{}')", msg, p.as_ref().display()))
    }
}

#[derive(Copy, Clone, Debug)]
enum ArchiveFormat {
    TarGz,
    TarBz2,
    TarZstd,
    Zip,
}

impl ArchiveFormat {
    pub fn peek(bytes: &[u8]) -> Option<ArchiveFormat> {
        let mut buf = [0u8; 1];
        if zstd::stream::read::Decoder::with_buffer(bytes)
            .map_or(false, |x| x.single_frame().read(&mut buf).is_ok())
        {
            Some(ArchiveFormat::TarZstd)
        } else if flate2::bufread::GzDecoder::new(bytes).header().is_some() {
            Some(ArchiveFormat::TarGz)
        } else if bzip2::bufread::BzDecoder::new(bytes).read(&mut buf).is_ok() {
            Some(ArchiveFormat::TarBz2)
        } else if zip::read::ZipArchive::new(Cursor::new(bytes)).is_ok() {
            Some(ArchiveFormat::Zip)
        } else {
            None
        }
    }

    pub fn make_decoder<'a>(self, bytes: &'a [u8]) -> Result<Box<dyn Read + 'a>, Error> {
        Ok(match self {
            ArchiveFormat::TarGz => Box::new(flate2::bufread::GzDecoder::new(bytes)) as Box<_>,
            ArchiveFormat::TarBz2 => Box::new(bzip2::bufread::BzDecoder::new(bytes)) as Box<_>,
            ArchiveFormat::TarZstd => {
                Box::new(zstd::stream::read::Decoder::with_buffer(bytes)?) as Box<_>
            }
            ArchiveFormat::Zip => return Err(anyhow!("zip cannot be decoded with read")),
        })
    }
}

/// Unpacks a tarball or zip archive.
///
/// Today this assumes that the tarball is zstd compressed which happens
/// to be what the indygreg python builds use.
pub fn unpack_archive<F>(
    contents: &[u8],
    dst: &Path,
    strip_components: usize,
    on_progress: F,
) -> Result<(), Error>
where
    F: Fn(f64, f64),
{
    let format = ArchiveFormat::peek(contents).ok_or_else(|| anyhow!("unknown archive"))?;

    if matches!(format, ArchiveFormat::Zip) {
        let mut archive = zip::read::ZipArchive::new(Cursor::new(contents))?;
        let total = archive.len() as f64;
        for i in 0..archive.len() {
            on_progress(i as f64, total);
            let mut file = archive.by_index(i)?;
            let name = file
                .enclosed_name()
                .ok_or_else(|| anyhow!("Invalid file path in zip"))?;
            let mut components = name.components();
            for _ in 0..strip_components {
                components.next();
            }
            let path = dst.join(components.as_path());
            if path != Path::new("") && path.strip_prefix(dst).is_ok() {
                if file.name().ends_with('/') {
                    fs::create_dir_all(&path).path_context(&path, "failed to create directory")?;
                } else {
                    if let Some(p) = path.parent() {
                        if !p.exists() {
                            fs::create_dir_all(p).path_context(p, "failed to create directory")?;
                        }
                    }
                    std::io::copy(
                        &mut file,
                        &mut fs::File::create(&path)
                            .path_context(&path, "failed to create file")?,
                    )?;
                }
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Some(mode) = file.unix_mode() {
                        fs::set_permissions(&path, fs::Permissions::from_mode(mode))
                            .path_context(&path, "failed to set permissions")?;
                    }
                }
            }
        }
    } else {
        let mut archive = tar::Archive::new(format.make_decoder(contents)?);
        let total = archive.entries()?.count() as f64;
        let mut archive = tar::Archive::new(format.make_decoder(contents)?);
        let count_step: usize = (total / 100.0 * 5.0).max(1.0).ceil() as usize;
        for (i, entry_result) in archive.entries()?.enumerate() {
            if i % count_step == 0 {
                on_progress(i as f64, total);
            }
            let mut entry = entry_result?;
            let name = entry.path()?;
            let mut components = name.components();
            for _ in 0..strip_components {
                components.next();
            }
            let path = dst.join(components.as_path());

            // only unpack if it's safe to do so
            if path != Path::new("") && path.strip_prefix(dst).is_ok() {
                if let Some(dir) = path.parent() {
                    fs::create_dir_all(dir).ok();
                }
                entry.unpack(&path)?;
            }
        }
    }

    Ok(())
}

pub fn pack_archive(sources: &Vec<PathBuf>, dest: &Path) -> Result<(), Error> {
    let mut archive = tar::Builder::new(Vec::new());
    for source in sources {
        let source = source
            .canonicalize()
            .path_context(source, "failed to canonicalize path")?;
        let source = source.as_path();
        if source.is_dir() {
            archive
                .append_dir_all(source.file_name().unwrap(), source)
                .path_context(source, "failed to append directory")?;
        } else {
            archive
                .append_path_with_name(source, source.file_name().unwrap())
                .path_context(source, "failed to append file")?;
        }
    }
    let archive = archive
        .into_inner()
        .path_context(dest, "failed to create archive")?;
    fs::write(dest, archive).path_context(dest, "failed to write archive")?;
    Ok(())
}
