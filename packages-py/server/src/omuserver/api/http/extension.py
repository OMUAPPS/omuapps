from __future__ import annotations

import io
import ipaddress
import socket
from asyncio import Future
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import aiohttp
from aiohttp import ClientResponse, ClientSession, ClientWebSocketResponse, WSCloseCode, WSMsgType
from omu.api.http.extension import (
    HTTP_ALLOWED_PORTS,
    HTTP_REQUEST_CLOSE,
    HTTP_REQUEST_CREATE,
    HTTP_REQUEST_PERMISSION_ID,
    HTTP_REQUEST_SEND,
    HTTP_RESPONSE_CHUNK,
    HTTP_RESPONSE_CLOSE,
    HTTP_RESPONSE_CREATE,
    WEBSOCKET_CLOSE,
    WEBSOCKET_CREATE,
    WEBSOCKET_DATA,
    WEBSOCKET_ERROR,
    WEBSOCKET_OPEN,
    DataChunk,
    HttpRequest,
    HttpResponse,
    RequestHandle,
    WebSocketClose,
    WSDataMeta,
)
from omu.app import App, AppType
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from yarl import URL

from omuserver.api.http.permission import HTTP_REQUEST_PERMISSION
from omuserver.session import Session

if TYPE_CHECKING:
    from omuserver.server import Server


def serialize_response(id: str, response: ClientResponse) -> HttpResponse:
    return {
        "id": id,
        "header": dict(response.headers),
        "history": [serialize_response(id, resp) for resp in response.history],
        "redirected": len(response.history) > 0,
        "status": response.status,
        "statusText": response.reason,
        "url": str(response.url),
    }


@dataclass(frozen=True, slots=True)
class HttpHandle:
    session: Session
    buffer: io.BytesIO
    close_future: Future[io.BytesIO] = field(default_factory=Future)


@dataclass(slots=True)
class WSHandle:
    session: Session
    socket: Future[aiohttp.ClientWebSocketResponse]


class NotAllowed(Exception): ...


class HttpExtension:
    def __init__(self, server: Server):
        self.server = server
        self.http_handles: dict[str, HttpHandle] = {}
        self.ws_handles: dict[str, WSHandle] = {}
        server.security.register_permission(HTTP_REQUEST_PERMISSION)
        server.network.register_packet(
            HTTP_REQUEST_CREATE,
            HTTP_REQUEST_SEND,
            HTTP_REQUEST_CLOSE,
            WEBSOCKET_CREATE,
            WEBSOCKET_OPEN,
            WEBSOCKET_CLOSE,
            WEBSOCKET_DATA,
            WEBSOCKET_ERROR,
        )
        server.network.add_packet_handler(HTTP_REQUEST_CREATE, self.handle_http_request_create)
        server.network.add_packet_handler(HTTP_REQUEST_SEND, self.handle_http_request_send)
        server.network.add_packet_handler(HTTP_REQUEST_CLOSE, self.handle_http_request_close)
        server.network.add_packet_handler(WEBSOCKET_CREATE, self.handle_ws_create)
        server.network.add_packet_handler(WEBSOCKET_DATA, self.handle_ws_send)
        server.network.add_packet_handler(WEBSOCKET_CLOSE, self.handle_ws_close)
        self.allowed_ports = server.tables.register(HTTP_ALLOWED_PORTS)
        server.server.apps.event.remove += self.on_app_removed

    async def on_app_removed(self, apps: Mapping[str, App]):
        for id in apps.keys():
            found = await self.allowed_ports.get(id)
            if found is None:
                continue
            await self.allowed_ports.remove(found)

    async def verify_port_allowed(self, session: Session, url: URL):
        if session.kind == AppType.DASHBOARD:
            return
        if url.host is None:
            raise Exception("Invalid url: host is not specified")
        ip_address = socket.gethostbyname(url.host)
        address = ipaddress.ip_address(ip_address)
        if address.is_global:
            return
        if url.port is None:
            return
        id = session.id.key()
        entry = await self.allowed_ports.get(id) or {"id": id, "ports": []}
        if url.port in entry["ports"]:
            return
        accepted = await self.server.dashboard.notify_http_port_request(session.app, url.port)
        if not accepted:
            raise NotAllowed(f"App {id} does not have permission to access port {url.port}.")
        entry["ports"].append(url.port)
        await self.allowed_ports.update(entry)

    async def handle_http_request_create(self, session: Session, packet: HttpRequest):
        if not session.permissions.has(HTTP_REQUEST_PERMISSION_ID):
            raise PermissionDenied(f"Missing HTTP request permission: {HTTP_REQUEST_PERMISSION_ID}")
        id = Identifier.from_key(packet["id"])
        if not session.is_app_id(id):
            raise Exception(f"Request id {packet['id']} is not a app id of {session.id.key()}")
        if packet["id"] in self.http_handles:
            raise Exception(f"Request id {packet['id']} already existing")
        try:
            url = URL(packet["url"])
            request = HttpHandle(session=session, buffer=io.BytesIO())
            await self.verify_port_allowed(session, url)
            self.http_handles[packet["id"]] = request
            await request.close_future
            async with ClientSession() as client:
                async with client.request(
                    packet["method"],
                    url,
                    headers=packet["header"],
                    allow_redirects=packet["redirect"] == "follow",
                    data=request.buffer.getbuffer(),
                ) as response:
                    await session.send(HTTP_RESPONSE_CREATE, serialize_response(packet["id"], response))
                    async for data, _ in response.content.iter_chunks():
                        await session.send(
                            HTTP_RESPONSE_CHUNK,
                            DataChunk({"id": packet["id"]}, data),
                        )
            await session.send(
                HTTP_RESPONSE_CLOSE,
                {"id": packet["id"]},
            )
        finally:
            del self.http_handles[packet["id"]]

    async def handle_http_request_send(self, session: Session, packet: DataChunk[RequestHandle]):
        if packet.meta["id"] not in self.http_handles:
            raise Exception(f"Request handle {packet.meta['id']} does not exist")
        handle = self.http_handles[packet.meta["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")
        handle.buffer.write(packet.data)

    async def handle_http_request_close(self, session: Session, packet: RequestHandle):
        if packet["id"] not in self.http_handles:
            raise Exception(f"Request handle {packet['id']} does not exist")
        handle = self.http_handles[packet["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")
        handle.close_future.set_result(handle.buffer)

    async def handle_ws_create(self, session: Session, packet: HttpRequest):
        if not session.permissions.has(HTTP_REQUEST_PERMISSION_ID):
            raise PermissionDenied(f"Missing HTTP request permission: {HTTP_REQUEST_PERMISSION_ID}")
        id = Identifier.from_key(packet["id"])
        if not session.is_app_id(id):
            raise Exception(f"Request id {packet['id']} is not a app id of {session.id.key()}")
        if packet["id"] in self.http_handles:
            raise Exception(f"Request id {packet['id']} already existing")

        try:
            url = URL(packet["url"])
            connect_future = Future[ClientWebSocketResponse]()
            request = WSHandle(session=session, socket=connect_future)
            await self.verify_port_allowed(session, url)
            self.ws_handles[packet["id"]] = request
            async with ClientSession() as client:
                async with client.ws_connect(
                    url,
                    method=packet["method"],
                    headers=packet["header"],
                ) as socket:

                    async def _close(_):
                        if socket.closed:
                            return
                        await socket.close()

                    session.event.disconnected += _close

                    connect_future.set_result(socket)
                    await session.send(
                        WEBSOCKET_OPEN,
                        {"id": packet["id"], "protocol": socket.protocol, "url": str(socket._response.url)},
                    )
                    while not socket.closed:
                        received = await socket.receive()
                        if received.type in {WSMsgType.TEXT, WSMsgType.BINARY}:
                            data = received.data
                            if isinstance(data, str):
                                data = data.encode(encoding="utf-8")
                            if session.closed:
                                await socket.close()
                                break
                            await session.send(
                                WEBSOCKET_DATA,
                                DataChunk(
                                    WSDataMeta({"id": packet["id"], "type": received.type.value}),
                                    data,
                                ),
                            )
                        elif received.type == WSMsgType.CLOSE:
                            close: WSCloseCode = received.data
                            await session.send(
                                WEBSOCKET_CLOSE,
                                {"id": packet["id"], "code": close, "reason": received.extra},
                            )
                        else:
                            pass
        except aiohttp.ClientConnectorError:
            await session.send(
                WEBSOCKET_ERROR,
                {"id": packet["id"], "type": "ConnectionRefused", "reason": ""},
            )
        except NotAllowed as e:
            await session.send(
                WEBSOCKET_ERROR,
                {"id": packet["id"], "type": "ConnectionRefused", "reason": str(e)},
            )
        finally:
            self.ws_handles.pop(packet["id"], None)

    async def handle_ws_send(self, session: Session, packet: DataChunk[WSDataMeta]):
        if packet.meta["id"] not in self.ws_handles:
            raise Exception(f"Request handle {packet.meta['id']} does not exist")
        handle = self.ws_handles[packet.meta["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")

        socket = await handle.socket
        if packet.meta["type"] == WSMsgType.TEXT:
            await socket.send_str(packet.data.decode("utf-8"))
        else:
            await socket.send_bytes(packet.data)

    async def handle_ws_close(self, session: Session, packet: WebSocketClose):
        if packet["id"] not in self.ws_handles:
            raise Exception(f"Request handle {packet['id']} does not exist")
        handle = self.ws_handles[packet["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")
        socket = await handle.socket
        message = packet.get("reason") or ""
        await socket.close(
            code=packet.get("code", WSCloseCode.OK),
            message=message.encode(encoding="utf-8"),
        )
