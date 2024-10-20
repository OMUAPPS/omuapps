from __future__ import annotations

from collections.abc import Callable

from omu.client import Client
from omu.event_emitter import EventEmitter, Unlisten
from omu.extension import Extension, ExtensionType
from omu.extension.endpoint import EndpointType
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.serializer import SerializeError, Serializer

from .packets import RegistryPacket, RegistryRegisterPacket
from .registry import Registry, RegistryType

REGISTRY_EXTENSION_TYPE = ExtensionType(
    "registry",
    lambda client: RegistryExtension(client),
    lambda: [],
)

REGISTRY_PERMISSION_ID = REGISTRY_EXTENSION_TYPE / "permission"

REGISTRY_REGISTER_PACKET = PacketType[RegistryRegisterPacket].create_serialized(
    REGISTRY_EXTENSION_TYPE,
    "register",
    serializer=RegistryRegisterPacket,
)
REGISTRY_UPDATE_PACKET = PacketType[RegistryPacket].create_serialized(
    REGISTRY_EXTENSION_TYPE,
    "update",
    serializer=RegistryPacket,
)
REGISTRY_LISTEN_PACKET = PacketType[Identifier].create_json(
    REGISTRY_EXTENSION_TYPE,
    "listen",
    Serializer.model(Identifier),
)
REGISTRY_GET_ENDPOINT = EndpointType[Identifier, RegistryPacket].create_serialized(
    REGISTRY_EXTENSION_TYPE,
    "get",
    request_serializer=Serializer.model(Identifier).to_json(),
    response_serializer=RegistryPacket,
    permission_id=REGISTRY_PERMISSION_ID,
)


class RegistryExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return REGISTRY_EXTENSION_TYPE

    def __init__(self, client: Client) -> None:
        self.client = client
        self.registries: dict[Identifier, Registry] = {}
        client.network.register_packet(
            REGISTRY_REGISTER_PACKET,
            REGISTRY_LISTEN_PACKET,
            REGISTRY_UPDATE_PACKET,
        )

    def create_registry[T](self, registry_type: RegistryType[T]) -> Registry[T]:
        self.client.permissions.require(REGISTRY_PERMISSION_ID)
        if registry_type.id in self.registries:
            raise ValueError(f"Registry {registry_type.id} already exists")
        return RegistryImpl(
            self.client,
            registry_type,
        )

    def get[T](self, registry_type: RegistryType[T]) -> Registry[T]:
        return self.create_registry(registry_type)

    def create[T](self, name: str, default_value: T) -> Registry[T]:
        identifier = self.client.app.id / name
        registry_type = RegistryType(
            identifier,
            default_value,
            Serializer.json(),
        )
        return self.create_registry(registry_type)


class RegistryImpl[T](Registry[T]):
    def __init__(
        self,
        client: Client,
        registry_type: RegistryType[T],
    ) -> None:
        self.client = client
        self.type = registry_type
        self._value = registry_type.default_value
        self.event_emitter: EventEmitter[T] = EventEmitter()
        self.listening = False
        client.network.add_packet_handler(REGISTRY_UPDATE_PACKET, self._handle_update)
        client.network.add_task(self._on_ready_task)

    @property
    def value(self) -> T:
        return self._value

    async def get(self) -> T:
        result = await self.client.endpoints.call(REGISTRY_GET_ENDPOINT, self.type.id)
        if result.value is None:
            return self.type.default_value
        try:
            return self.type.serializer.deserialize(result.value)
        except SerializeError as e:
            raise SerializeError(
                f"Failed to deserialize registry value for identifier {self.type.id}"
            ) from e

    async def set(self, value: T) -> None:
        packet = RegistryPacket(
            id=self.type.id,
            value=self.type.serializer.serialize(value),
        )
        await self.client.send(
            REGISTRY_UPDATE_PACKET,
            packet,
        )
        await self.event_emitter.emit(value)

    async def update(self, handler: Coro[[T], T]) -> None:
        value = await self.get()
        new_value = await handler(value)
        await self.set(new_value)

    def listen(self, handler: Coro[[T], None] | Callable[[T], None]) -> Unlisten:
        if not self.listening and self.client.ready:
            coro = self.client.send(REGISTRY_LISTEN_PACKET, self.type.id)
            self.client.loop.create_task(coro)
        self.listening = True

        return self.event_emitter.listen(handler)

    async def _handle_update(self, event: RegistryPacket) -> None:
        if event.id != self.type.id:
            return
        if event.value is not None:
            try:
                self._value = self.type.serializer.deserialize(event.value)
            except SerializeError as e:
                msg = f"Failed to deserialize registry value for id {self.type.id}"
                raise SerializeError(msg) from e
        await self.event_emitter.emit(self._value)

    async def _on_ready_task(self) -> None:
        if self.listening:
            await self.client.send(REGISTRY_LISTEN_PACKET, self.type.id)
        if not self.type.id.is_subpath_of(self.client.app.id):
            return
        packet = RegistryRegisterPacket(
            id=self.type.id,
            permissions=self.type.permissions,
        )
        await self.client.send(REGISTRY_REGISTER_PACKET, packet)
