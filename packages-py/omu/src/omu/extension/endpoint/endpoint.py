from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


@dataclass(frozen=True, slots=True)
class EndpointType[Req, Res]:
    id: Identifier
    request_serializer: Serializable[Req, bytes]
    response_serializer: Serializable[Res, bytes]
    permission_id: Identifier | None = None

    @classmethod
    def create_json(
        cls,
        identifier: Identifier,
        name: str,
        request_serializer: Serializable[Req, Any] | None = None,
        response_serializer: Serializable[Res, Any] | None = None,
        permission_id: Identifier | None = None,
    ):
        request_serializer = Serializer.of(
            request_serializer or Serializer.noop()
        ).to_json()
        response_serializer = Serializer.of(
            response_serializer or Serializer.noop()
        ).to_json()
        return cls(
            id=identifier / name,
            request_serializer=request_serializer,
            response_serializer=response_serializer,
            permission_id=permission_id,
        )

    @classmethod
    def create_serialized(
        cls,
        identifier: Identifier,
        name: str,
        request_serializer: Serializable[Req, bytes],
        response_serializer: Serializable[Res, bytes],
        permission_id: Identifier | None = None,
    ):
        return cls(
            id=identifier / name,
            request_serializer=request_serializer,
            response_serializer=response_serializer,
            permission_id=permission_id,
        )
