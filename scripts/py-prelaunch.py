import json
import os
from pathlib import Path

from helper import update_version
from omuserver.lock import Lock


def generate_lock():
    lock_file = Path("appdata/server.lock")
    lock = Lock(
        pid=None,
        token=os.urandom(16).hex(),
    )
    lock_file.write_text(
        json.dumps(
            {
                "pid": lock.pid,
                "token": lock.token,
            },
            indent=4,
        )
    )


def main():
    update_version()


if __name__ == "__main__":
    main()
