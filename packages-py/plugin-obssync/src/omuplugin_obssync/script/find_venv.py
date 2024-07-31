import sys
from pathlib import Path


def find_venv() -> Path | None:
    current_path = Path(__file__)
    while current_path != Path("/"):
        if (current_path / ".venv").exists():
            return current_path / ".venv"
        current_path = current_path.parent
    return None


if venv_path := find_venv():
    print(f"Found venv at {venv_path}")
    sys.path.append(str(venv_path / "Lib" / "site-packages"))
else:
    print("No venv found")
