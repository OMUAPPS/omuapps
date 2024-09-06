import asyncio

from loguru import logger
from omu import Identifier
from omu.event_emitter import Unlisten
from omu.extension.registry.packets import RegistryPermissions
from omu.extension.registry.registry_extension import (
    REGISTRY_UPDATE_PACKET,
    RegistryPacket,
)
from omu.serializer import Serializable

from omuserver.server import Server
from omuserver.session import Session


class ServerRegistry:
    def __init__(
        self,
        server: Server,
        id: Identifier,
        permissions: RegistryPermissions | None = None,
    ) -> None:
        self.id = id
        self.permissions = permissions or RegistryPermissions()
        self._listeners: dict[Identifier, tuple[Session, Unlisten]] = {}
        self._path = server.directories.get(
            "registry"
        ) / id.get_sanitized_path().with_suffix(".json")
        self._changed = False
        self.value: bytes | None = None
        self.save_task: asyncio.Task | None = None

    async def load(self):
        if self._changed:
            raise Exception("Registry already loaded")
        if self._path.exists():
            self.value = self._path.read_bytes()

    async def store(self, value: bytes | None) -> None:
        self.value = value
        self._changed = True
        if self.save_task is None:
            self.save_task = asyncio.create_task(self._save())

    async def _save(self) -> None:
        while self._changed:
            if self.value is None:
                self._path.unlink(missing_ok=True)
            else:
                self._path.parent.mkdir(parents=True, exist_ok=True)
                self._path.write_bytes(self.value)
            self._changed = False
            await asyncio.sleep(1)
        self.save_task = None

    async def notify(self, session: Session) -> None:
        async with asyncio.TaskGroup() as tg:
            for listener, _ in self._listeners.values():
                if listener == session:
                    continue
                if listener.closed:
                    raise Exception(f"Session {listener.app=} closed")
                send = listener.send(
                    REGISTRY_UPDATE_PACKET,
                    RegistryPacket(id=self.id, value=self.value),
                )
                tg.create_task(send)

    async def attach_session(self, session: Session) -> None:
        if session.app.id in self._listeners:
            logger.warning(f"Session {session.app.id} is already to registry {self.id}")
            return
        unlisten = session.event.disconnected.listen(self.detach_session)
        self._listeners[session.app.id] = session, unlisten
        await session.send(
            REGISTRY_UPDATE_PACKET,
            RegistryPacket(id=self.id, value=self.value),
        )

    async def detach_session(self, session: Session) -> None:
        if session.app.id not in self._listeners:
            raise Exception("Session not attached")
        _, unlisten = self._listeners.pop(session.app.id)
        unlisten()


class Registry[T]:
    def __init__(
        self,
        registry: ServerRegistry,
        default_value: T,
        serializer: Serializable[T, bytes],
    ) -> None:
        self._registry = registry
        self._default_value = default_value
        self._serializer = serializer

    async def get(self) -> T:
        if self._registry.value is None:
            return self._default_value
        return self._serializer.deserialize(self._registry.value)

    async def set(self, value: T) -> None:
        await self._registry.store(self._serializer.serialize(value))
