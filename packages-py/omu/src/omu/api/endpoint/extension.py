from __future__ import annotations

from asyncio import Future
from dataclasses import dataclass

from omu.api import Extension, ExtensionType
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.omu import Omu

from .endpoint import EndpointType
from .packets import (
    EndpointInvokedPacket,
    EndpointInvokePacket,
    EndpointRegisterPacket,
    EndpointResponsePacket,
    InvokeParams,
    ResponseParams,
)

ENDPOINT_EXTENSION_TYPE = ExtensionType("endpoint", lambda client: EndpointExtension(client))


@dataclass(frozen=True, slots=True)
class EndpointHandler:
    endpoint_type: EndpointType
    func: Coro[[EndpointInvokedPacket], bytes]


class EndpointExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return ENDPOINT_EXTENSION_TYPE

    def __init__(self, omu: Omu) -> None:
        self.omu = omu
        self.response_futures: dict[int, Future[EndpointResponsePacket]] = {}
        self.registered_endpoints: dict[Identifier, EndpointHandler] = {}
        self.call_id = 0
        omu.network.register_packet(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_INVOKE_PACKET,
            ENDPOINT_INVOKED_PACKET,
            ENDPOINT_RESPONSE_PACKET,
        )
        omu.network.add_packet_handler(ENDPOINT_RESPONSE_PACKET, self._on_response)
        omu.network.add_packet_handler(ENDPOINT_INVOKED_PACKET, self._on_invoked)
        omu.network.add_task(self.on_ready)

    async def _on_response(self, packet: EndpointResponsePacket) -> None:
        future = self.response_futures.pop(packet.params.key, None)
        if future is None:
            raise Exception(f"Received response for unknown call key {packet.params.key} ({packet.params.id.key()})")
        future.set_result(packet)

    async def _on_invoked(self, packet: EndpointInvokedPacket) -> None:
        handler = self.registered_endpoints.get(packet.params.id)
        if handler is None:
            raise Exception(f"Received invocation for unknown endpoint {packet.params.id.key()} ({packet.params.key})")
        try:
            result = await handler.func(packet)
            await self.omu.send(
                ENDPOINT_RESPONSE_PACKET,
                EndpointResponsePacket(
                    params=ResponseParams(
                        id=packet.params.id,
                        key=packet.params.key,
                        error=None,
                    ),
                    buffer=result,
                ),
            )
        except Exception as e:
            await self.omu.send(
                ENDPOINT_RESPONSE_PACKET,
                EndpointResponsePacket(
                    params=ResponseParams(
                        id=packet.params.id,
                        key=packet.params.key,
                        error=repr(e),
                    ),
                    buffer=b"",
                ),
            )
            raise e

    async def on_ready(self) -> None:
        endpoints = {key: endpoint.endpoint_type.permission_id for key, endpoint in self.registered_endpoints.items()}
        packet = EndpointRegisterPacket(endpoints=endpoints)
        await self.omu.send(ENDPOINT_REGISTER_PACKET, packet)

    def register[Req, Res](self, type: EndpointType[Req, Res], func: Coro[[Req], Res]) -> None:
        if self.omu.ready:
            raise Exception("Cannot register endpoint after client is ready")
        if type.id in self.registered_endpoints:
            raise Exception(f"Endpoint for key {type.id} already registered")

        async def wrapper(packet: EndpointInvokedPacket) -> bytes:
            request = type.request_serializer.deserialize(packet.buffer)
            result = await func(request)
            return type.response_serializer.serialize(result)

        self.registered_endpoints[type.id] = EndpointHandler(
            endpoint_type=type,
            func=wrapper,
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

    async def call[Req, Res](self, endpoint: EndpointType[Req, Res], data: Req) -> Res:
        try:
            self.call_id += 1
            future = Future[EndpointResponsePacket]()
            self.response_futures[self.call_id] = future
            serialized = endpoint.request_serializer.serialize(data)
            await self.omu.send(
                ENDPOINT_INVOKE_PACKET,
                EndpointInvokePacket(
                    params=InvokeParams(
                        id=endpoint.id,
                        key=self.call_id,
                    ),
                    buffer=serialized,
                ),
            )
            res = await future
            return endpoint.response_serializer.deserialize(res.buffer)
        except Exception as e:
            raise Exception(f"Error calling endpoint {endpoint.id.key()}") from e


ENDPOINT_REGISTER_PACKET = PacketType[EndpointRegisterPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    name="register",
    serializer=EndpointRegisterPacket,
)
ENDPOINT_INVOKE_PACKET = PacketType[EndpointInvokePacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    name="invoke",
    serializer=EndpointInvokePacket,
)
ENDPOINT_INVOKED_PACKET = PacketType[EndpointInvokedPacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    name="invoked",
    serializer=EndpointInvokedPacket,
)
ENDPOINT_RESPONSE_PACKET = PacketType[EndpointResponsePacket].create_serialized(
    ENDPOINT_EXTENSION_TYPE,
    name="response",
    serializer=EndpointResponsePacket,
)
