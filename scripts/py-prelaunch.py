import os
from pathlib import Path

from helper import update_version

TOKEN_FILE = Path("appdata/token.txt")


def clear_pycache():
    for root, dirs, _ in os.walk("packages-py"):
        for dir in dirs:
            if dir == "__pycache__":
                pycache = Path(root) / dir
                for file in pycache.iterdir():
                    file.unlink()
                pycache.rmdir()


def generate_lock():
    token = os.urandom(16).hex()
    TOKEN_FILE.write_text(token, encoding="utf-8")


def main():
    clear_pycache()
    update_version()
    generate_lock()


if __name__ == "__main__":
    main()
