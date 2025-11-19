import pathlib
from dataclasses import dataclass
from typing import LiteralString


@dataclass(slots=True)
class Directories:
    data: pathlib.Path
    assets: pathlib.Path
    index: pathlib.Path
    frame: pathlib.Path
    index_install: pathlib.Path
    version: pathlib.Path
    dashboard: pathlib.Path | None = None

    @classmethod
    def default(cls):
        cwd = pathlib.Path.cwd()
        return Directories(
            data=cwd / "data",
            assets=cwd / "assets",
            index=pathlib.Path(__file__).parent / "index.html",
            frame=pathlib.Path(__file__).parent / "frame.html",
            index_install=pathlib.Path(__file__).parent / "index_install.html",
            version=cwd / "VERSION",
        )

    def mkdir(self):
        self.data.mkdir(parents=True, exist_ok=True)
        self.assets.mkdir(parents=True, exist_ok=True)

    def get(self, name: LiteralString):
        path = self.data / name
        path.mkdir(parents=True, exist_ok=True)
        return path
