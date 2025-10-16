from __future__ import annotations

from typing import TYPE_CHECKING

from loguru import logger
from omu.api.logger.extension import LOGGER_LISTEN_PACKET, LOGGER_LOG_PACKET, LOGGER_LOG_PERMISSION_ID
from omu.api.logger.packets import LogMessage, LogPacket
from omu.errors import PermissionDenied
from omu.identifier import Identifier

from omuserver.session import Session

from .permissions import LOGGER_LOG_PERMISSION

if TYPE_CHECKING:
    from omuserver.server import Server


class LoggerExtension:
    def __init__(self, server: Server):
        server.security.register_permission(LOGGER_LOG_PERMISSION)
        server.packets.register(LOGGER_LOG_PACKET, LOGGER_LISTEN_PACKET)
        server.packets.bind(LOGGER_LOG_PACKET, self.handle_log)
        server.packets.bind(LOGGER_LISTEN_PACKET, self.handle_listen)
        self.listeners: dict[Identifier, set[Session]] = {}

    async def broadcast(self, id: Identifier, message: LogMessage) -> None:
        packet = LogPacket(id=id, message=message)
        for session in self.listeners.get(id, []):
            await session.send(LOGGER_LOG_PACKET, packet)

    async def handle_log(self, session: Session, packet: LogPacket) -> None:
        if not session.permissions.has(LOGGER_LOG_PERMISSION_ID):
            raise PermissionDenied("You do not have permission to log")
        logger.info(f"{packet.id}: {packet.message}")

    async def handle_listen(self, session: Session, id: Identifier) -> None:
        if not session.permissions.has(LOGGER_LOG_PERMISSION_ID):
            raise PermissionDenied("You do not have permission to listen to logs")
        if id not in self.listeners:
            self.listeners[id] = set()
        self.listeners[id].add(session)
