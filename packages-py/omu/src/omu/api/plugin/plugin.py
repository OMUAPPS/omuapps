from dataclasses import dataclass
from typing import TypedDict

from omu.interface import Keyable
from omu.model import Model


class PluginPackageInfoData(TypedDict):
    package: str
    version: str


@dataclass(frozen=True, slots=True)
class PluginPackageInfo(Keyable, Model[PluginPackageInfoData]):
    package: str
    version: str

    @classmethod
    def from_json(cls, json: PluginPackageInfoData) -> "PluginPackageInfo":
        return cls(
            package=json["package"],
            version=json["version"],
        )

    def to_json(self) -> PluginPackageInfoData:
        return {"package": self.package, "version": self.version}

    def key(self) -> str:
        return self.package
