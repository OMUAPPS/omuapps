from loguru import logger
from omu.extension.logger.logger_extension import (
    LOGGER_LISTEN_PACKET,
    LOGGER_LOG_PACKET,
)
from omu.extension.logger.packets import LogMessage, LogPacket
from omu.identifier import Identifier

from omuserver.server import Server
from omuserver.session import Session

from .permissions import (
    LOGGER_LOG_PERMISSION,
)


class LoggerExtension:
    def __init__(self, server: Server):
        server.permission_manager.register(
            LOGGER_LOG_PERMISSION,
        )
        server.packet_dispatcher.register(
            LOGGER_LOG_PACKET,
            LOGGER_LISTEN_PACKET,
        )
        server.packet_dispatcher.add_packet_handler(
            LOGGER_LOG_PACKET,
            self.handle_log,
        )
        server.packet_dispatcher.add_packet_handler(LOGGER_LISTEN_PACKET, self.handle_listen)
        self.listeners: dict[Identifier, set[Session]] = {}

    async def broadcast(self, id: Identifier, message: LogMessage) -> None:
        packet = LogPacket(id=id, message=message)
        for session in self.listeners.get(id, []):
            await session.send(LOGGER_LOG_PACKET, packet)

    async def handle_log(self, session: Session, packet: LogPacket) -> None:
        logger.info(f"{packet.id}: {packet.message}")

    async def handle_listen(self, session: Session, id: Identifier) -> None:
        if id not in self.listeners:
            self.listeners[id] = set()
        self.listeners[id].add(session)
