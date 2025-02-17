from __future__ import annotations

from collections.abc import Callable

from omu.errors import PermissionDenied
from omu.event_emitter import Unlisten
from omu.extension.signal import SignalPermissions
from omu.extension.signal.packets import SignalRegisterPacket
from omu.extension.signal.signal_extension import (
    SIGNAL_LISTEN_PACKET,
    SIGNAL_NOTIFY_PACKET,
    SIGNAL_REGISTER_PACKET,
    SignalPacket,
)
from omu.identifier import Identifier

from omuserver import Server
from omuserver.session import Session


class SignalExtension:
    def __init__(self, server: Server):
        self._server = server
        self.signals: dict[Identifier, ServerSignal] = {}
        server.packet_dispatcher.register(
            SIGNAL_REGISTER_PACKET,
            SIGNAL_LISTEN_PACKET,
            SIGNAL_NOTIFY_PACKET,
        )
        server.packet_dispatcher.add_packet_handler(
            SIGNAL_REGISTER_PACKET, self.handle_register
        )
        server.packet_dispatcher.add_packet_handler(
            SIGNAL_LISTEN_PACKET, self.handle_listen
        )
        server.packet_dispatcher.add_packet_handler(
            SIGNAL_NOTIFY_PACKET, self.handle_notify
        )

    def get_signal(self, id: Identifier) -> ServerSignal:
        if id in self.signals:
            return self.signals[id]
        signal = ServerSignal(
            server=self._server,
            id=id,
            permissions=SignalPermissions(),
        )
        self.signals[id] = signal
        return signal

    def verify_permission(
        self,
        signal: ServerSignal,
        session: Session,
        get_scopes: Callable[[SignalPermissions], list[Identifier | None]],
    ) -> None:
        if signal.id.is_namepath_equal(session.app.id, path_length=1):
            return
        for permission in get_scopes(signal.permissions):
            if permission is None:
                continue
            if session.permission_handle.has(permission):
                return
        msg = f"App {session.app.id=} not allowed to access {signal.id=}"
        raise PermissionDenied(msg)

    async def handle_register(
        self, session: Session, data: SignalRegisterPacket
    ) -> None:
        if not data.id.is_subpath_of(session.app.id):
            raise PermissionDenied("App not allowed to register signal")
        signal = self.get_signal(data.id)
        signal.permissions = data.permissions

    async def handle_listen(self, session: Session, id: Identifier) -> None:
        signal = self.get_signal(id)
        self.verify_permission(
            signal,
            session,
            lambda permissions: [permissions.all, permissions.listen],
        )
        signal.attach_session(session)

    async def handle_notify(self, session: Session, data: SignalPacket) -> None:
        signal = self.get_signal(data.id)
        self.verify_permission(
            signal,
            session,
            lambda permissions: [permissions.all, permissions.notify],
        )
        await signal.notify(data.body)


class ServerSignal:
    def __init__(
        self,
        server: Server,
        id: Identifier,
        permissions: SignalPermissions,
    ) -> None:
        self.server = server
        self.id = id
        self.listeners: dict[Session, Unlisten] = {}
        self.permissions = permissions

    async def notify(self, body: bytes) -> None:
        packet = SignalPacket(id=self.id, body=body)
        for listener in self.listeners:
            await listener.send(SIGNAL_NOTIFY_PACKET, packet)

    def attach_session(self, session: Session) -> None:
        if session in self.listeners:
            raise Exception("Session already attached")
        unlisten = session.event.disconnected.listen(self.detach_session)
        self.listeners[session] = unlisten

    def detach_session(self, session: Session) -> None:
        if session not in self.listeners:
            raise Exception("Session not attached")
        unlisten = self.listeners.pop(session)
        unlisten()
