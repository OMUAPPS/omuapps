import sys
from pathlib import Path

DEBUGPY_PORT = 5678


def find_project() -> Path | None:
    current_path = Path(__file__)
    while current_path != Path("/"):
        if (current_path / ".venv").exists():
            return current_path
        current_path = current_path.parent
    return None


def init():
    venv_path = find_project()
    if venv_path is None:
        print("No venv found")
        return

    load_venv_packages(venv_path)


def load_venv_packages(venv_path: Path):
    print(f"Loading venv packages from {venv_path}")
    site_packages = venv_path / ".venv" / "Lib" / "site-packages"
    sys.path.append(str(site_packages))
    for pth_file in site_packages.glob("*.pth"):
        sys.path.extend(map(str.strip, pth_file.read_text().splitlines()))
