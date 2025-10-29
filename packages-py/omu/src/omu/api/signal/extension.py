from __future__ import annotations

from omu.api import Extension, ExtensionType
from omu.event_emitter import Unlisten
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.omu import Omu
from omu.serializer import Serializer

from .packets import SignalPacket, SignalRegisterPacket
from .signal import Signal, SignalType

SIGNAL_EXTENSION_TYPE = ExtensionType("signal", lambda client: SignalExtension(client))


SIGNAL_REGISTER_PACKET = PacketType[SignalRegisterPacket].create_serialized(
    SIGNAL_EXTENSION_TYPE,
    "register",
    SignalRegisterPacket,
)
SIGNAL_LISTEN_PACKET = PacketType[Identifier].create_json(
    SIGNAL_EXTENSION_TYPE,
    "listen",
    serializer=Serializer.model(Identifier),
)
SIGNAL_NOTIFY_PACKET = PacketType[SignalPacket].create_serialized(
    SIGNAL_EXTENSION_TYPE,
    "notify",
    SignalPacket,
)


class SignalExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return SIGNAL_EXTENSION_TYPE

    def __init__(self, omu: Omu):
        self.client = omu
        self.signals: dict[Identifier, Signal] = {}
        omu.network.register_packet(
            SIGNAL_REGISTER_PACKET,
            SIGNAL_LISTEN_PACKET,
            SIGNAL_NOTIFY_PACKET,
        )

    def create_signal[T](self, signal_type: SignalType[T]) -> Signal[T]:
        if signal_type.id in self.signals:
            raise Exception(f"Signal {signal_type.id} already exists")
        return SignalImpl(self.client, signal_type)

    def create[T](self, name: str, _t: type[T] | None = None) -> Signal[T]:
        identifier = self.client.app.id / name
        type = SignalType[T].create_json(
            identifier,
            name,
        )
        return self.create_signal(type)

    def get[T](self, signal_type: SignalType[T]) -> Signal[T]:
        return self.create_signal(signal_type)


class SignalImpl[T](Signal):
    def __init__(self, omu: Omu, type: SignalType[T]):
        self.client = omu
        self.type = type
        self.listeners: list[Coro[[T], None]] = []
        self.listening = False
        omu.network.add_packet_handler(SIGNAL_NOTIFY_PACKET, self._on_broadcast)
        omu.network.add_task(self._on_task)

    async def notify(self, body: T) -> None:
        data = self.type.serializer.serialize(body)
        await self.client.send(
            SIGNAL_NOTIFY_PACKET,
            SignalPacket(id=self.type.id, body=data),
        )
        for listener in self.listeners:
            await listener(body)

    def listen(self, listener: Coro[[T], None]) -> Unlisten:
        if not self.listening:

            async def on_ready():
                await self.client.send(SIGNAL_LISTEN_PACKET, self.type.id)

            self.client.on_ready(on_ready)
            self.listening = True

        self.listeners.append(listener)
        return lambda: self.listeners.remove(listener)

    async def _on_task(self) -> None:
        if not self.type.id.is_subpath_of(self.client.app.id):
            return
        packet = SignalRegisterPacket(
            id=self.type.id,
            permissions=self.type.permissions,
        )
        await self.client.send(
            SIGNAL_REGISTER_PACKET,
            packet,
        )

    async def _on_broadcast(self, data: SignalPacket) -> None:
        if data.id != self.type.id:
            return

        body = self.type.serializer.deserialize(data.body)
        for listener in self.listeners:
            await listener(body)
