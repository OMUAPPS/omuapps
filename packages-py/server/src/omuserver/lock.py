from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True, frozen=True)
class Lock:
    pid: int | None
    token: str

    @classmethod
    def create(cls) -> Lock:
        pid = os.getpid()
        token = os.urandom(16).hex()
        return Lock(
            pid=pid,
            token=token,
        )

    @classmethod
    def load(cls, path: Path) -> Lock:
        if not path.exists():
            return cls.create()
        lock = Lock(**json.loads(path.read_text()))
        return lock

    def acquire(self, path: Path):
        path.write_text(
            json.dumps(
                {
                    "pid": os.getpid(),
                    "token": self.token,
                }
            )
        )
