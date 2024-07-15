from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from omu.identifier import Identifier
from omu.interface.keyable import Keyable
from omu.localization import LocalizedText
from omu.model import Model

type PermissionLevel = Literal["low", "medium", "high"]


class PermissionMetadata(TypedDict):
    name: LocalizedText
    note: LocalizedText
    level: PermissionLevel


class PermissionTypeJson(TypedDict):
    id: str
    metadata: PermissionMetadata


@dataclass(frozen=True, slots=True)
class PermissionType(Model[PermissionTypeJson], Keyable):
    id: Identifier
    metadata: PermissionMetadata

    @classmethod
    def create(
        cls,
        identifier: Identifier,
        name: str,
        metadata: PermissionMetadata,
    ) -> PermissionType:
        return PermissionType(
            id=identifier / name,
            metadata=metadata,
        )

    def to_json(self) -> PermissionTypeJson:
        return {
            "id": self.id.key(),
            "metadata": self.metadata,
        }

    @classmethod
    def from_json(cls, json: PermissionTypeJson) -> PermissionType:
        return PermissionType(
            id=Identifier.from_key(json["id"]),
            metadata=json["metadata"],
        )

    def key(self) -> str:
        return self.id.key()
