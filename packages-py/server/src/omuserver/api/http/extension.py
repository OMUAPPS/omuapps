from __future__ import annotations

import io
from asyncio import Future
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from aiohttp import ClientResponse, ClientSession
from omu.api.http.extension import (
    HTTP_REQUEST_CLOSE,
    HTTP_REQUEST_CREATE,
    HTTP_REQUEST_PERMISSION_ID,
    HTTP_REQUEST_SEND,
    HTTP_RESPONSE_CHUNK,
    HTTP_RESPONSE_CLOSE,
    HTTP_RESPONSE_CREATE,
    HttpChunk,
    HttpRequest,
    HttpResponse,
    RequestHandle,
)
from omu.errors import PermissionDenied
from yarl import URL

from omuserver.api.http.permission import HTTP_REQUEST_PERMISSION
from omuserver.session.session import Session

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


@dataclass
class Request:
    session: Session
    buffer: io.BytesIO = field(default_factory=io.BytesIO)
    close_future: Future[io.BytesIO] = field(default_factory=Future)


class HttpExtension:
    def __init__(self, server: Server):
        self.server = server
        self.requests: dict[str, Request] = {}
        server.security.register(HTTP_REQUEST_PERMISSION)
        server.network.register_packet(
            HTTP_REQUEST_CREATE,
            HTTP_REQUEST_SEND,
            HTTP_REQUEST_CLOSE,
        )
        server.network.add_packet_handler(HTTP_REQUEST_CREATE, self.handle_request_create)
        server.network.add_packet_handler(HTTP_REQUEST_SEND, self.handle_request_send)
        server.network.add_packet_handler(HTTP_REQUEST_CLOSE, self.handle_request_close)

    async def handle_request_create(self, session: Session, packet: HttpRequest):
        if not session.permissions.has(HTTP_REQUEST_PERMISSION_ID):
            raise PermissionDenied(f"Missing HTTP request permission: {HTTP_REQUEST_PERMISSION_ID}")
        url = URL(packet["url"])
        request = Request(session=session)
        self.requests[packet["id"]] = request
        await request.close_future
        async with ClientSession() as client:
            async with client.request(
                packet["method"],
                url,
                headers=packet["header"],
                allow_redirects=packet["redirect"] == "follow",
                data=request.buffer,
            ) as response:
                await session.send(HTTP_RESPONSE_CREATE, serialize_response(packet["id"], response))
                async for data, _ in response.content.iter_chunks():
                    await session.send(
                        HTTP_RESPONSE_CHUNK,
                        HttpChunk({"id": packet["id"]}, data),
                    )
        await session.send(
            HTTP_RESPONSE_CLOSE,
            {"id": packet["id"]},
        )

    async def handle_request_send(self, session: Session, packet: HttpChunk[RequestHandle]):
        handle = self.requests[packet.meta["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")
        handle.buffer.write(packet.data)

    async def handle_request_close(self, session: Session, packet: RequestHandle):
        handle = self.requests[packet["id"]]
        if handle.session != session:
            raise PermissionDenied("Mismatched session on request handle")
        handle.close_future.set_result(handle.buffer)
