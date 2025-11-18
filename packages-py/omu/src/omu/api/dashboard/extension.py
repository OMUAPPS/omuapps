from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal, LiteralString, TypedDict

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.api.permission.permission import PermissionTypeJson
from omu.api.plugin.package_info import PackageInfo
from omu.api.registry.registry import RegistryPermissions, RegistryType
from omu.api.server.extension import AppIndexRegistryMeta
from omu.api.table.table import TablePermissions, TableType
from omu.app import App, AppJson
from omu.bytebuffer import ByteReader, ByteWriter
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.serializer import Serializer

from .packets import (
    AppInstallRequestPacket,
    AppInstallResponse,
    AppUpdateRequestPacket,
)

if TYPE_CHECKING:
    from omu.omu import Omu

DASHBOARD_EXTENSION_TYPE = ExtensionType("dashboard", lambda client: DashboardExtension(client))


class DashboardSetResponse(TypedDict):
    success: bool


DASHBOARD_SET_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE / "set"
DASHBOARD_SET_ENDPOINT = EndpointType[Identifier, DashboardSetResponse].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "set",
    request_serializer=Serializer.model(Identifier),
    permission_id=DASHBOARD_SET_PERMISSION_ID,
)
DASHBOARD_OPEN_APP_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE / "app" / "open"
DASHBOARD_OPEN_APP_ENDPOINT = EndpointType[App, None].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "open_app",
    request_serializer=Serializer.model(App),
    permission_id=DASHBOARD_OPEN_APP_PERMISSION_ID,
)
DASHBOARD_OPEN_APP_PACKET = PacketType[App].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "open_app",
    Serializer.model(App),
)
DASHBOARD_APP_INSTALL_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE / "app" / "install"
DASHBOARD_APP_INSTALL_ENDPOINT = EndpointType[App, AppInstallResponse].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "install_app",
    request_serializer=Serializer.model(App),
    permission_id=DASHBOARD_APP_INSTALL_PERMISSION_ID,
)
DASHBOARD_APP_INSTALL_PACKET = PacketType[AppInstallRequestPacket].create_serialized(
    DASHBOARD_EXTENSION_TYPE,
    "install_app",
    AppInstallRequestPacket,
)
DASHBOARD_APP_UPDATE_PACKET = PacketType[AppUpdateRequestPacket].create_serialized(
    DASHBOARD_EXTENSION_TYPE,
    "update_app",
    AppUpdateRequestPacket,
)

DASHBOARD_DRAG_DROP_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE / "drag_drop"


class DragDropFile(TypedDict):
    type: Literal["file", "directory"]
    size: int
    name: str


class DragDropPosition(TypedDict):
    x: int
    y: int


class DragEnter(TypedDict):
    type: Literal["enter"]
    drag_id: str
    files: list[DragDropFile]
    position: DragDropPosition


class DragOver(TypedDict):
    type: Literal["over"]
    drag_id: str
    position: DragDropPosition


class DragDrop(TypedDict):
    type: Literal["drop"]
    drag_id: str
    files: list[DragDropFile]
    position: DragDropPosition


class DragLeave(TypedDict):
    type: Literal["leave"]
    drag_id: str


type DragState = DragEnter | DragOver | DragDrop | DragLeave


class FileDragPacket(TypedDict):
    drag_id: str
    app: AppJson
    state: DragState


DASHBOARD_DRAG_DROP_STATE_PACKET = PacketType[FileDragPacket].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "drag_drop_state",
)


class DragDropReadRequest(TypedDict):
    drag_id: str


class DragDropReadRequestDashboard(TypedDict):
    request_id: str
    drag_id: str


class DragDropReadMeta(TypedDict):
    request_id: str
    drag_id: str
    files: list[DragDropFile]


class FileData(TypedDict):
    file: DragDropFile
    buffer: bytes


@dataclass
class DragDropReadResponse:
    meta: DragDropReadMeta
    files: dict[str, FileData]
    version: int = 1

    @staticmethod
    def serialize(item: DragDropReadResponse) -> bytes:
        writer = ByteWriter()
        writer.write_uleb128(item.version)
        writer.write_string(json.dumps(item.meta))
        writer.write_uleb128(len(item.files))

        for key, data in item.files.items():
            writer.write_string(key)
            writer.write_string(json.dumps(data["file"]))
            writer.write_uint8_array(data["buffer"])

        return writer.finish()

    @staticmethod
    def deserialize(item: bytes) -> DragDropReadResponse:
        with ByteReader(item) as reader:
            version = reader.read_uleb128()
            meta: DragDropReadMeta = json.loads(reader.read_string())
            length = reader.read_uleb128()

            files: dict[str, FileData] = {}
            for _ in range(length):
                key = reader.read_string()
                file: DragDropFile = json.loads(reader.read_string())
                buffer = reader.read_uint8_array()
                files[key] = {
                    "file": file,
                    "buffer": buffer,
                }

        return DragDropReadResponse(
            version=version,
            meta=meta,
            files=files,
        )


DASHBOARD_DRAG_DROP_READ_ENDPOINT = EndpointType[DragDropReadRequest, DragDropReadResponse].create_serialized(
    DASHBOARD_EXTENSION_TYPE,
    "drag_drop_read",
    request_serializer=Serializer.json(),
    response_serializer=DragDropReadResponse,
    permission_id=DASHBOARD_DRAG_DROP_PERMISSION_ID,
)

DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET = PacketType[DragDropReadRequestDashboard].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "drag_drop_read_request",
)

DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET = PacketType[DragDropReadResponse].create_serialized(
    DASHBOARD_EXTENSION_TYPE,
    "drag_drop_read_response",
    serializer=DragDropReadResponse,
)


class DragDropRequest(TypedDict): ...


class DragDropRequestDashboard(TypedDict):
    request_id: str
    app: AppJson


class DragDropRequestResponse(TypedDict):
    request_id: str
    ok: bool


DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT = EndpointType[DragDropRequest, DragDropRequestResponse].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "drag_drop_request",
    permission_id=DASHBOARD_DRAG_DROP_PERMISSION_ID,
)

DASHBOARD_DRAG_DROP_REQUEST_PACKET = PacketType[DragDropRequestDashboard].create_json(
    DASHBOARD_EXTENSION_TYPE, "drag_drop_request"
)


class PromptRequestBase[T: LiteralString](TypedDict):
    kind: T
    id: str


class PromptRequestAppPermissions(PromptRequestBase[Literal["app/permissions"]]):
    app: AppJson
    permissions: list[PermissionTypeJson]


class PromptRequestAppPlugins(PromptRequestBase[Literal["app/plugins"]]):
    app: AppJson
    packages: list[PackageInfo]


class PromptRequestAppInstall(PromptRequestBase[Literal["app/install"]]):
    app: AppJson
    dependencies: dict[str, AppJson]


class PromptRequestAppUpdate(PromptRequestBase[Literal["app/update"]]):
    old_app: AppJson
    new_app: AppJson
    dependencies: dict[str, AppJson]


class PromptRequestIndexInstall(PromptRequestBase[Literal["index/install"]]):
    index_url: str
    meta: AppIndexRegistryMeta


class PortProcess(TypedDict):
    port: int
    name: str
    exe: str


class PromptRequestHttpPort(PromptRequestBase[Literal["http/port"]]):
    app: AppJson
    processes: list[PortProcess]


type PromptRequest = (
    PromptRequestAppPermissions
    | PromptRequestAppPlugins
    | PromptRequestAppInstall
    | PromptRequestAppUpdate
    | PromptRequestIndexInstall
    | PromptRequestHttpPort
)

DASHBOARD_PROMPT_REQUEST = PacketType[PromptRequest].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "prompt_request",
)

type PromptResult = Literal["accept", "deny", "block"]


class PromptResponse(TypedDict):
    id: str
    kind: str
    result: PromptResult


DASHBOARD_PROMPT_RESPONSE = PacketType[PromptResponse].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "prompt_response",
)

DASHBOARD_PROMPT_CLEAR_BLOCKED = EndpointType[None, None].create_json(
    DASHBOARD_EXTENSION_TYPE,
    "prompt_clear_blocked",
    permission_id=DASHBOARD_SET_PERMISSION_ID,
)

DASHBOARD_WEBVIEW_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE / "webview"


@dataclass
class WebviewEventPacket:
    id: Identifier
    target: Identifier
    event: Any

    @staticmethod
    def serialize(packet: WebviewEventPacket):
        return {
            "id": packet.id.key(),
            "target": packet.target.key(),
            "event": packet.event,
        }

    @staticmethod
    def deserialize(packet: dict):
        return WebviewEventPacket(
            id=Identifier.from_key(packet["id"]),
            target=Identifier.from_key(packet["target"]),
            event=packet["event"],
        )


DASHBOARD_WEBVIEW_EVENT_PACKET = PacketType[WebviewEventPacket].create_json(
    DASHBOARD_EXTENSION_TYPE,
    name="webview_event",
    serializer=WebviewEventPacket,
)


class AllowedHost(TypedDict):
    id: str
    hosts: list[str]


DASHBOARD_ALLOWED_WEBVIEW_HOSTS = TableType[AllowedHost].create_json(
    DASHBOARD_EXTENSION_TYPE,
    name="allowed_webview_hosts",
    key=lambda entry: entry["id"],
    permissions=TablePermissions(all=DASHBOARD_SET_PERMISSION_ID),
)
DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE.join("speech_recognition")


class TranscriptSegment(TypedDict):
    confidence: float
    transcript: str


class TranscriptStatusIdle(TypedDict):
    type: Literal["idle"]


class TranscriptStatusResult(TypedDict):
    type: Literal["result"]
    timestamp: float
    segments: list[TranscriptSegment]


class TranscriptStatusFinal(TypedDict):
    type: Literal["final"]
    timestamp: float
    segments: list[TranscriptSegment]


class TranscriptStatusAudioStarted(TypedDict):
    type: Literal["audio_started"]
    timestamp: float


class TranscriptStatusAudioEnded(TypedDict):
    type: Literal["audio_ended"]
    timestamp: float


type TranscriptStatus = (
    TranscriptStatusIdle
    | TranscriptStatusResult
    | TranscriptStatusFinal
    | TranscriptStatusAudioStarted
    | TranscriptStatusAudioEnded
)


DASHBOARD_SPEECH_RECOGNITION = RegistryType[TranscriptStatus].create_json(
    DASHBOARD_EXTENSION_TYPE,
    name="speech_recognition",
    default_value={"type": "idle"},
    permissions=RegistryPermissions(
        read=DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        write=DASHBOARD_SET_PERMISSION_ID,
    ),
)


class SpeechRecognitionStart(TypedDict):
    type: Literal["start"]


DASHBOARD_SPEECH_RECOGNITION_START = EndpointType[SpeechRecognitionStart, Any].create_json(
    DASHBOARD_EXTENSION_TYPE,
    name="speech_recognition_start",
    permission_id=DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
)


class DashboardExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return DASHBOARD_EXTENSION_TYPE

    def __init__(self, omu: Omu):
        self.omu = omu
        self.omu.network.register_packet(
            DASHBOARD_OPEN_APP_PACKET,
            DASHBOARD_APP_INSTALL_PACKET,
            DASHBOARD_APP_UPDATE_PACKET,
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_PACKET,
        )

    async def open_app(self, app: App) -> None:
        if not self.omu.permissions.has(DASHBOARD_OPEN_APP_PERMISSION_ID):
            error = f"Pemission {DASHBOARD_OPEN_APP_PERMISSION_ID} required to open app {app}"
            raise PermissionDenied(error)
        await self.omu.endpoints.call(DASHBOARD_OPEN_APP_ENDPOINT, app)
