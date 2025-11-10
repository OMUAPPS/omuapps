from __future__ import annotations

import time
from typing import TYPE_CHECKING

from omu.api.permission import PermissionType
from omu.api.permission.extension import (
    PERMISSION_GRANT_PACKET,
    PERMISSION_REGISTER_PACKET,
    PERMISSION_REQUEST_ENDPOINT,
    PERMISSION_REQUIRE_PACKET,
)
from omu.app import AppType
from omu.errors import PermissionDenied
from omu.identifier import Identifier

from omuserver.session import Session, TaskPriority

if TYPE_CHECKING:
    from omuserver.server import Server


class PermissionExtension:
    def __init__(self, server: Server) -> None:
        server.packets.register(PERMISSION_REGISTER_PACKET, PERMISSION_REQUIRE_PACKET, PERMISSION_GRANT_PACKET)
        server.packets.bind(PERMISSION_REGISTER_PACKET, self.handle_register)
        server.packets.bind(PERMISSION_REQUIRE_PACKET, self.handle_require)
        server.endpoints.bind(PERMISSION_REQUEST_ENDPOINT, self.handle_request)
        self.server = server
        self.request_key = 0

    async def handle_register(self, session: Session, permission_types: list[PermissionType]) -> None:
        for perm in permission_types:
            if not perm.id.is_subpath_of(session.app.id):
                msg = f"Permission identifier {perm.id} " f"is not a subpart of app identifier {session.app.id}"
                raise ValueError(msg)
        self.server.security.register_permission(*permission_types, overwrite=True)

    async def handle_require(self, session: Session, permission_ids: list[Identifier]):
        if session.ready:
            raise ValueError("Session is already ready")

        async def task():
            permissions = list(
                filter(None, (self.server.security.permissions.get(perm_id) for perm_id in permission_ids))
            )
            missing_permissions = list(filter(lambda id: id not in self.server.security.permissions, permission_ids))
            if missing_permissions:
                raise PermissionDenied(f"Requested permissions do not exist: {missing_permissions}")
            if session.permissions.has_all(permission_ids):
                await session.send(PERMISSION_GRANT_PACKET, permissions)
                return
            if session.kind == AppType.REMOTE:
                raise PermissionDenied("Remote apps cannot request permissions")
            if session.kind in {AppType.PLUGIN, AppType.DASHBOARD}:
                return
            request_id = self._get_next_request_key()
            accepted = await self.server.dashboard.request_permissions(app=session.app, permissions=permissions)
            if not accepted:
                msg = f"Permission request denied (id={request_id})"
                raise PermissionDenied(msg)
            session.permissions.grant_all([p.id for p in permissions])
            if not session.closed:
                await session.send(PERMISSION_GRANT_PACKET, permissions)

        session.add_task(
            task,
            name="permission_require",
            detail=f"Requiring permissions: {', '.join(map(Identifier.key, permission_ids))}",
            priority=TaskPriority.AFTER_SESSION,
        )

    async def handle_request(self, session: Session, permission_identifiers: list[Identifier]): ...

    def _get_next_request_key(self) -> str:
        self.request_key += 1
        return f"{self.request_key}-{time.time_ns()}"
