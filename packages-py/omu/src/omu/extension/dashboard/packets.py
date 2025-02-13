from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TypedDict

from omu.app import App
from omu.bytebuffer import ByteReader, ByteWriter
from omu.extension.permission import PermissionType
from omu.extension.plugin.package_info import PackageInfo


@dataclass(frozen=True, slots=True)
class PermissionRequestPacket:
    request_id: str
    app: App
    permissions: list[PermissionType]

    @classmethod
    def serialize(cls, item: PermissionRequestPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.request_id)
        writer.write_string(json.dumps(item.app.to_json()))
        writer.write_string(json.dumps(tuple(map(PermissionType.to_json, item.permissions))))
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> PermissionRequestPacket:
        with ByteReader(item) as reader:
            request_id = reader.read_string()
            app = App.from_json(json.loads(reader.read_string()))
            permissions = map(PermissionType.from_json, json.loads(reader.read_string()))
            return cls(request_id, app, list(permissions))


@dataclass(frozen=True, slots=True)
class PluginRequestPacket:
    request_id: str
    app: App
    packages: list[PackageInfo]

    @classmethod
    def serialize(cls, item: PluginRequestPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.request_id)
        writer.write_string(json.dumps(item.app.to_json()))
        writer.write_string(json.dumps(item.packages))
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> PluginRequestPacket:
        with ByteReader(item) as reader:
            request_id = reader.read_string()
            app = App.from_json(json.loads(reader.read_string()))
            plugins = map(PackageInfo, json.loads(reader.read_string()))
            return cls(request_id, app, list(plugins))


@dataclass(frozen=True, slots=True)
class AppInstallRequestPacket:
    request_id: str
    app: App

    @classmethod
    def serialize(cls, item: AppInstallRequestPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.request_id)
        writer.write_string(json.dumps(item.app.to_json()))
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> AppInstallRequestPacket:
        with ByteReader(item) as reader:
            request_id = reader.read_string()
            app = App.from_json(json.loads(reader.read_string()))
            return cls(request_id, app)


@dataclass(frozen=True, slots=True)
class AppUpdateRequestPacket:
    request_id: str
    old_app: App
    new_app: App

    @classmethod
    def serialize(cls, item: AppUpdateRequestPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.request_id)
        writer.write_string(json.dumps(item.old_app.to_json()))
        writer.write_string(json.dumps(item.new_app.to_json()))
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> AppUpdateRequestPacket:
        with ByteReader(item) as reader:
            request_id = reader.read_string()
            old_app = App.from_json(json.loads(reader.read_string()))
            new_app = App.from_json(json.loads(reader.read_string()))
            return cls(request_id, old_app, new_app)


class AppInstallResponse(TypedDict):
    accepted: bool


class AppUpdateResponse(TypedDict):
    accepted: bool
