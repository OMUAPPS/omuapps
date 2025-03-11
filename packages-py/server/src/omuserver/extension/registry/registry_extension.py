from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

from omu.errors import PermissionDenied
from omu.extension.permission import PermissionType
from omu.extension.registry import RegistryType
from omu.extension.registry.packets import RegistryPermissions, RegistryRegisterPacket
from omu.extension.registry.registry_extension import (
    REGISTRY_GET_ENDPOINT,
    REGISTRY_LISTEN_PACKET,
    REGISTRY_PERMISSION_ID,
    REGISTRY_REGISTER_PACKET,
    REGISTRY_UPDATE_PACKET,
    RegistryPacket,
)
from omu.identifier import Identifier

from omuserver.session import Session

from .registry import Registry, ServerRegistry

if TYPE_CHECKING:
    from omuserver.server import Server

REGISTRY_PERMISSION = PermissionType(
    REGISTRY_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "レジストリ",
            "en": "Registry Permission",
        },
        "note": {
            "ja": "アプリがデータを保持するために使われます",
            "en": "Used by apps to store data",
        },
    },
)


class RegistryExtension:
    def __init__(self, server: Server) -> None:
        self._server = server
        self.registries: dict[Identifier, ServerRegistry] = {}
        self._startup_registries: list[ServerRegistry] = []
        server.security.register(REGISTRY_PERMISSION)
        server.packets.register(REGISTRY_REGISTER_PACKET, REGISTRY_LISTEN_PACKET, REGISTRY_UPDATE_PACKET)
        server.packets.bind(REGISTRY_REGISTER_PACKET, self.handle_register)
        server.packets.bind(REGISTRY_LISTEN_PACKET, self.handle_listen)
        server.packets.bind(REGISTRY_UPDATE_PACKET, self.handle_update)
        server.endpoints.bind(REGISTRY_GET_ENDPOINT, self.handle_get)
        server.event.start += self._on_start

    async def _on_start(self) -> None:
        for registry in self._startup_registries:
            await registry.load()
        self._startup_registries.clear()

    async def handle_register(self, session: Session, packet: RegistryRegisterPacket) -> None:
        registry = await self.get(packet.id)
        if not registry.id.is_subpath_of(session.app.id):
            msg = f"App {session.app.id=} not allowed to register {packet.id=}"
            raise PermissionDenied(msg)
        registry.permissions = packet.permissions

    async def handle_listen(self, session: Session, id: Identifier) -> None:
        await session.wait_ready()
        registry = await self.get_with_perm(id, session, lambda perms: [perms.all, perms.read])
        await registry.attach_session(session)

    async def handle_update(self, session: Session, packet: RegistryPacket) -> None:
        await session.wait_ready()
        registry = await self.get_with_perm(packet.id, session, lambda perms: [perms.all, perms.write])
        await registry.store(packet.value)
        await registry.notify(session)

    async def handle_get(self, session: Session, id: Identifier) -> RegistryPacket:
        await session.wait_ready()
        registry = await self.get_with_perm(id, session, lambda perms: [perms.all, perms.read])
        return RegistryPacket(id, registry.value)

    async def get(self, id: Identifier) -> ServerRegistry:
        registry = self.registries.get(id)
        if registry is None:
            registry = ServerRegistry(
                server=self._server,
                id=id,
            )
            self.registries[id] = registry
            await registry.load()
        return registry

    async def get_with_perm(
        self, id: Identifier, session: Session, get_scope: Callable[[RegistryPermissions], list[Identifier | None]]
    ) -> ServerRegistry:
        registry = await self.get(id)
        self.verify_permission(registry, session, get_scope)
        return registry

    def verify_permission(
        self,
        registry: ServerRegistry,
        session: Session,
        get_scopes: Callable[[RegistryPermissions], list[Identifier | None]],
    ) -> None:
        if session.is_app_id(registry.id):
            return
        require_permissions = get_scopes(registry.permissions)
        if not session.permissions.has_any(filter(None, require_permissions)):
            msg = f"App {session.app.id=} not allowed to access {registry.id=}"
            raise PermissionDenied(msg)

    def register[T](
        self,
        registry_type: RegistryType[T],
    ) -> Registry[T]:
        registry = self.registries.get(registry_type.id)
        if registry is None:
            registry = ServerRegistry(
                server=self._server,
                id=registry_type.id,
                permissions=registry_type.permissions,
            )
            self.registries[registry_type.id] = registry
            self._startup_registries.append(registry)
        return Registry(
            registry,
            registry_type.default_value,
            registry_type.serializer,
        )
