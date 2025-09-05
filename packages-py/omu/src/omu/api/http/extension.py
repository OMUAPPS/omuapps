from __future__ import annotations

import io
import random
import time
from asyncio import Future
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, TypedDict

from loguru import logger
from yarl import URL

from omu.api.extension import Extension, ExtensionType
from omu.bytebuffer import ByteReader, ByteWriter
from omu.client import Client
from omu.network.packet.packet import PacketType

HTTP_EXTENSION_TYPE = ExtensionType(
    "http",
    lambda client: HttpExtension(client),
    lambda: [],
)

HTTP_REQUEST_PERMISSION_ID = HTTP_EXTENSION_TYPE / "request"


class RequestHandle(TypedDict):
    id: str


type RequestRedirect = Literal["error", "follow", "manual"]


class HttpRequest(RequestHandle):
    header: dict[str, str]
    method: str
    redirect: RequestRedirect
    url: str


HTTP_REQUEST_CREATE = PacketType[HttpRequest].create_json(
    HTTP_EXTENSION_TYPE,
    name="request_create",
)


@dataclass
class HttpChunk[T]:
    meta: T
    data: bytes

    @staticmethod
    def serialize(data: HttpChunk[T]):
        writer = ByteWriter()
        writer.write_json(data.meta)
        writer.write_uint8_array(data.data)
        return writer.finish()

    @staticmethod
    def deserialize(data: bytes) -> HttpChunk[T]:
        with ByteReader(data) as reader:
            meta: T = reader.read_json()
            body = reader.read_uint8_array()
        return HttpChunk(meta, body)


HTTP_REQUEST_SEND = PacketType[HttpChunk[RequestHandle]].create_serialized(
    HTTP_EXTENSION_TYPE,
    name="request_send",
    serializer=HttpChunk,
)

type HttpRequestClose = RequestHandle

HTTP_REQUEST_CLOSE = PacketType[HttpRequestClose].create_json(
    HTTP_EXTENSION_TYPE,
    name="request_close",
)


class HttpResponse(RequestHandle):
    header: dict[str, str]
    status: int
    statusText: str | None
    url: str
    history: list[HttpResponse]
    redirected: bool


HTTP_RESPONSE_CREATE = PacketType[HttpResponse].create_json(
    HTTP_EXTENSION_TYPE,
    name="response_create",
)

HTTP_RESPONSE_CHUNK = PacketType[HttpChunk[RequestHandle]].create_serialized(
    HTTP_EXTENSION_TYPE,
    name="response_chunk",
    serializer=HttpChunk,
)

type HttpResponseClose = RequestHandle

HTTP_RESPONSE_CLOSE = PacketType[HttpResponseClose].create_json(
    HTTP_EXTENSION_TYPE,
    name="response_close",
)


class HandleStateReceiving(TypedDict):
    type: Literal["receiving"]
    receive: Callable[[bytes]]
    close: Callable[[]]


class HandleStateCreated(TypedDict):
    type: Literal["created"]
    setResponse: Callable[[HttpResponse]]


type HandleState = HandleStateCreated | HandleStateReceiving


class HttpExtension(Extension):
    @property
    def type(self):
        return HTTP_EXTENSION_TYPE

    handles: dict[str, HandleState] = {}

    def __init__(
        self,
        client: Client,
    ):
        self.client = client
        client.network.register_packet(
            HTTP_REQUEST_CREATE,
            HTTP_REQUEST_SEND,
            HTTP_REQUEST_CLOSE,
            HTTP_RESPONSE_CREATE,
            HTTP_RESPONSE_CHUNK,
            HTTP_RESPONSE_CLOSE,
        )
        client.network.add_packet_handler(HTTP_RESPONSE_CREATE, self.handle_response_create)
        client.network.add_packet_handler(HTTP_RESPONSE_CHUNK, self.handle_response_chunk)
        client.network.add_packet_handler(HTTP_RESPONSE_CLOSE, self.handle_response_close)

    async def handle_response_create(self, packet: HttpResponse):
        handle = self.handles.get(packet["id"])
        if handle is None:
            logger.warning("Received response for unknown request", packet["id"])
            return
        if handle["type"] != "created":
            logger.warning("Received response for already handled request", packet["id"])
            return
        handle["setResponse"](packet)

    async def handle_response_chunk(self, packet: HttpChunk[RequestHandle]):
        handle = self.handles.get(packet.meta["id"])
        if handle is None:
            logger.warning("Received response for unknown request", packet.meta["id"])
            return
        if handle["type"] != "receiving":
            logger.warning("Received chunk for non-receiving request", packet.meta["id"])
            return
        handle["receive"](packet.data)

    async def handle_response_close(self, packet: HttpResponseClose):
        handle = self.handles.get(packet["id"])
        if handle is None:
            logger.warning("Received response for unknown request", packet["id"])
            return
        if handle["type"] != "receiving":
            logger.warning("Received chunk for non-receiving request", packet["id"])
            return
        handle["close"]()

    def generate_id(self) -> str:
        rnd = int(time.time_ns() - random.random() * 1e12)
        id = self.client.app.id / str(rnd)
        return id.key()

    async def request(
        self,
        method: str,
        redirect: RequestRedirect,
        input: str | URL,
        headers: dict[str, str],
        body: bytes | io.BytesIO,
    ) -> HttpResponse:
        url = URL(input)
        id = self.generate_id()
        await self.client.send(
            HTTP_REQUEST_CREATE,
            {
                "id": id,
                "header": headers,
                "method": method,
                "redirect": redirect,
                "url": url.human_repr(),
            },
        )
        if body:
            if isinstance(body, bytes):
                await self.client.send(HTTP_REQUEST_SEND, HttpChunk[RequestHandle]({"id": id}, body))
            else:
                while True:
                    # Read in 16MB chunks
                    chunk = body.read(1024 * 1024 * 16)
                    if not chunk:
                        break
                    await self.client.send(HTTP_REQUEST_SEND, HttpChunk[RequestHandle]({"id": id}, chunk))

        await self.client.send(HTTP_REQUEST_CLOSE, {"id": id})
        chunks: bytes = b""
        responseFuture = Future[HttpResponse]()
        chunkEvent = Future[bool]()

        def receive(data: bytes):
            nonlocal chunks
            chunks += data
            nonlocal chunkEvent
            chunkEvent.set_result(True)
            chunkEvent = Future[bool]()

        def setResponse(response: HttpResponse):
            responseFuture.set_result(response)

            self.handles[id] = {
                "type": "receiving",
                "receive": receive,
                "close": lambda: chunkEvent.set_result(False),
            }

        self.handles[id] = {
            "type": "created",
            "setResponse": setResponse,
        }
        response = await responseFuture
        while await chunkEvent:
            ...
        return response
