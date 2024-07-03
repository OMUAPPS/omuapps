import os
from pathlib import Path

from helper import update_version

TOKEN_FILE = Path("appdata/token.txt")


def generate_lock():
    token = os.urandom(16).hex()
    TOKEN_FILE.write_text(token, encoding="utf-8")


def main():
    update_version()
    generate_lock()


if __name__ == "__main__":
    main()
