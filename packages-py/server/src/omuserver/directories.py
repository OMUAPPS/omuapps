import pathlib
from dataclasses import dataclass
from typing import LiteralString


@dataclass(frozen=True, slots=True)
class Directories:
    data: pathlib.Path
    assets: pathlib.Path
    index: pathlib.Path

    @classmethod
    def default(cls):
        cwd = pathlib.Path.cwd()
        return Directories(
            data=cwd / "data",
            assets=cwd / "assets",
            index=pathlib.Path(__file__).parent / "index.html",
        )

    def mkdir(self):
        self.data.mkdir(parents=True, exist_ok=True)
        self.assets.mkdir(parents=True, exist_ok=True)

    def get(self, name: LiteralString):
        path = self.data / name
        path.mkdir(parents=True, exist_ok=True)
        return path
