from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from loguru import logger
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import Packet, PacketType
from omu.network.packet_mapper import PacketMapper

from omuserver.session import Session


class ServerPacketDispatcher:
    def __init__(self):
        self.packet_mapper = PacketMapper()
        self._packet_listeners: dict[Identifier, PacketHandler] = {}

    async def process_packet(self, session: Session, packet: Packet) -> None:
        listeners = self._packet_listeners.get(packet.type.id)
        if not listeners:
            logger.warning(f"Received unknown packet type {packet.type}")
            return
        if listeners.handler is None:
            raise ValueError(f"No handler for packet type {packet.type}")
        await listeners.handler(session, packet.data)

    def register(self, *types: PacketType) -> None:
        self.packet_mapper.register(*types)
        for type in types:
            if self._packet_listeners.get(type.id):
                raise ValueError(f"Packet id {type.id} already registered")
            self._packet_listeners[type.id] = PacketHandler(type)

    def bind[T](
        self,
        packet_type: PacketType[T],
        handler: Coro[[Session, T], None] | None = None,
    ) -> Callable[[Coro[[Session, T], None]], None]:
        if not self._packet_listeners.get(packet_type.id):
            raise ValueError(f"Packet type {packet_type.id} not registered")

        def decorator(func: Coro[[Session, T], None]) -> None:
            self._packet_listeners[packet_type.id].handler = func

        if handler:
            decorator(handler)
        return decorator


@dataclass(slots=True)
class PacketHandler[T]:
    packet_type: PacketType[T]
    handler: Coro[[Session, T], None] | None = None
