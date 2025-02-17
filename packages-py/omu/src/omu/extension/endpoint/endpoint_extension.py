from __future__ import annotations

from asyncio import Future
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from omu.client import Client
from omu.extension import Extension, ExtensionType
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import PacketType

from .endpoint import EndpointType
from .packets import (
    EndpointDataPacket,
    EndpointErrorPacket,
    EndpointRegisterPacket,
)

ENDPOINT_EXTENSION_TYPE = ExtensionType(
    "endpoint",
    lambda client: EndpointExtension(client),
    lambda: [],
)


@dataclass(frozen=True, slots=True)
class EndpointHandler:
    endpoint_type: EndpointType
    func: Coro[[Any], Any]


class EndpointExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return ENDPOINT_EXTENSION_TYPE

    def __init__(self, client: Client) -> None:
        self.client = client
        self.response_futures: dict[int, Future] = {}
        self.registered_endpoints: dict[Identifier, EndpointHandler] = {}
        self.call_id = 0
        client.network.register_packet(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_CALL_PACKET,
            ENDPOINT_RECEIVE_PACKET,
            ENDPOINT_ERROR_PACKET,
        )
        client.network.add_packet_handler(ENDPOINT_RECEIVE_PACKET, self._on_receive)
        client.network.add_packet_handler(ENDPOINT_ERROR_PACKET, self._on_error)
        client.network.add_packet_handler(ENDPOINT_CALL_PACKET, self._on_call)
        client.network.add_task(self.on_ready)

    async def _on_receive(self, packet: EndpointDataPacket) -> None:
        if packet.key not in self.response_futures:
            raise Exception(f"Received response for unknown call key {packet.key}")
        future = self.response_futures.pop(packet.key)
        future.set_result(packet.data)

    async def _on_error(self, packet: EndpointErrorPacket) -> None:
        if packet.key not in self.response_futures:
            raise Exception(f"Received error for unknown call key {packet.key}")
        future = self.response_futures.pop(packet.key)
        future.set_exception(Exception(packet.error))

    async def _on_call(self, packet: EndpointDataPacket) -> None:
        if packet.id not in self.registered_endpoints:
            raise Exception(f"Received call for unknown endpoint {packet.id}")
        handler = self.registered_endpoints[packet.id]
        endpoint = handler.endpoint_type
        func = handler.func
        try:
            req = endpoint.request_serializer.deserialize(packet.data)
            res = await func(req)
            res_data = endpoint.response_serializer.serialize(res)
            await self.client.send(
                ENDPOINT_RECEIVE_PACKET,
                EndpointDataPacket(id=packet.id, key=packet.key, data=res_data),
            )
        except Exception as e:
            await self.client.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(id=packet.id, key=packet.key, error=str(e)),
            )
            raise e

    async def on_ready(self) -> None:
        endpoints = {
            key: endpoint.endpoint_type.permission_id
            for key, endpoint in self.registered_endpoints.items()
        }
        packet = EndpointRegisterPacket(endpoints=endpoints)
        await self.client.send(ENDPOINT_REGISTER_PACKET, packet)

    def register[Req, Res](
        self, type: EndpointType[Req, Res], func: Coro[[Req], Res]
    ) -> None:
        if self.client.ready:
            raise Exception("Cannot register endpoint after client is ready")
        if type.id in self.registered_endpoints:
            raise Exception(f"Endpoint for key {type.id} already registered")
        self.registered_endpoints[type.id] = EndpointHandler(
            endpoint_type=type,
            func=func,
        )

    def bind[T, R](
        self,
        handler: Coro[[T], R] | None = None,
        endpoint_type: EndpointType[T, R] | None = None,
    ):
        if endpoint_type is None:
            raise Exception("Endpoint type must be provided")

        def decorator(func: Coro[[T], R]) -> Coro[[T], R]:
            self.register(endpoint_type, func)
            return func

        if handler:
            decorator(handler)
        return decorator

    def listen(
        self, handler: Coro | None = None, name: str | None = None
    ) -> Callable[[Coro], Coro]:
        def decorator(func: Coro) -> Coro:
            type = EndpointType.create_json(
                self.client.app.id,
                name or func.__name__,
            )
            self.register(type, func)
            return func

        if handler:
            decorator(handler)
        return decorator

    async def call[Req, Res](self, endpoint: EndpointType[Req, Res], data: Req) -> Res:
        try:
            self.call_id += 1
            future = Future[bytes]()
            self.response_futures[self.call_id] = future
            json = endpoint.request_serializer.serialize(data)
            await self.client.send(
                ENDPOINT_CALL_PACKET,
                EndpointDataPacket(id=endpoint.id, key=self.call_id, data=json),
            )
            res = await future
            return endpoint.response_serializer.deserialize(res)
        except Exception as e:
            raise Exception(f"Error calling endpoint {endpoint.id.key()}") from e


ENDPOINT_REGISTER_PACKET = PacketType[EndpointRegisterPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    "register",
    EndpointRegisterPacket,
)
ENDPOINT_CALL_PACKET = PacketType[EndpointDataPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    "call",
    EndpointDataPacket,
)
ENDPOINT_RECEIVE_PACKET = PacketType[EndpointDataPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    "receive",
    EndpointDataPacket,
)
ENDPOINT_ERROR_PACKET = PacketType[EndpointErrorPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    "error",
    EndpointErrorPacket,
)
