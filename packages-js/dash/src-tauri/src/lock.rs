use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{fs::File, path::PathBuf};
use sysinfo::{PidExt, ProcessExt, System, SystemExt};

#[derive(Serialize, Deserialize)]
pub struct Lock {
    pub pid: Option<u32>,
    pub token: String,
}

impl Lock {
    pub fn new(pid: Option<u32>, token: String) -> Lock {
        Lock { pid, token }
    }

    pub fn load(path: PathBuf) -> Result<Lock, String> {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let lock: Lock = serde_json::from_reader(file).map_err(|e| e.to_string())?;
        Ok(lock)
    }

    pub fn save(&self, path: PathBuf) -> Result<(), String> {
        let file = File::create(path).map_err(|e| e.to_string())?;
        serde_json::to_writer(file, self).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn set_pid(&mut self, pid: u32) {
        self.pid = Some(pid);
    }

    pub fn ensure(path: &PathBuf) -> Result<(bool, Lock), String> {
        if !path.exists() {
            let lock = Lock::new(None, generate_token());
            lock.save(path.to_path_buf())?;
            return Ok((false, lock));
        }
        let file = File::open(path).map_err(|e| e.to_string())?;
        let lock: Lock = serde_json::from_reader(file).map_err(|e| e.to_string())?;
        println!("pid: {:?}", lock.pid);
        if let Some(pid) = lock.pid {
            if is_locked(pid) {
                println!("pid {} is locked", pid);
                return Ok((true, lock));
            }
        }
        let lock = Lock::new(None, generate_token());
        return Ok((false, lock));
    }
}

fn is_locked(pid: u32) -> bool {
    let system = System::new_all();
    for (pid_, process) in system.processes() {
        if pid == pid_.as_u32() {
            // println!("pid: {}, name: {}", pid, process.name());
            if !process.name().contains("python") {
                continue;
            }
            return true;
        }
    }
    false
}

fn generate_token() -> String {
    rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(32)
        .map(char::from)
        .collect::<String>()
}
