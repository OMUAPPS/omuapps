from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from omuplugin_obs.script.config import Config


def get_config_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True)
    config = appdata / "obs_config.json"
    return config


def get_config() -> Config:
    path = get_config_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"Config file not found at {path}")
    except json.JSONDecodeError:
        print(f"Config file at {path} is not valid JSON")
    return {}


def get_python_path() -> Path | None:
    config = get_config()
    python_path = config.get("python_path")
    if not python_path or not Path(python_path).exists():
        return None
    return Path(python_path)


def find_venv() -> Path | None:
    current_path = Path(__file__)
    while current_path != current_path.parent:
        if (current_path / ".venv").exists():
            return current_path / ".venv"
        current_path = current_path.parent
    return None


def try_load():
    python_path = get_python_path()
    venv_path = find_venv()
    if python_path:
        load_site_packages(python_path / "Lib" / "site-packages")
    if venv_path:
        load_site_packages(venv_path / "Lib" / "site-packages")
    print(f"[+], {"\n".join(sys.path)}")


def load_site_packages(site_packages: Path):
    print(f"Loading site-packages from {site_packages}")
    sys.path.append(str(site_packages))
    for pth_file in site_packages.glob("*.pth"):
        sys.path.extend(map(str.strip, pth_file.read_text().splitlines()))
