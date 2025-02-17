import json
import sys
from pathlib import Path


def get_config_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True)
    config = appdata / "obs_config.json"
    return config


def get_python_path() -> Path:
    config_path = get_config_path()
    return Path(json.loads(config_path.read_text(encoding="utf-8"))["python_path"])


def find_venv() -> Path | None:
    current_path = Path(__file__)
    while current_path != current_path.parent:
        if (current_path / ".venv").exists():
            return current_path / ".venv"
        current_path = current_path.parent
    return None


def try_load():
    python_path = get_python_path()
    load_site_packages(python_path / "Lib" / "site-packages")
    venv_path = find_venv()
    if venv_path:
        load_site_packages(venv_path / "Lib" / "site-packages")


def load_site_packages(site_packages: Path):
    print(f"Loading site-packages from {site_packages}")
    sys.path.append(str(site_packages))
    for pth_file in site_packages.glob("*.pth"):
        sys.path.extend(map(str.strip, pth_file.read_text().splitlines()))
