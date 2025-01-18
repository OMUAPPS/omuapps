from __future__ import annotations

import time

from omu.app import AppType
from omu.errors import PermissionDenied
from omu.extension.dashboard.packets import PermissionRequestPacket
from omu.extension.permission import PermissionType
from omu.extension.permission.permission_extension import (
    PERMISSION_GRANT_PACKET,
    PERMISSION_REGISTER_PACKET,
    PERMISSION_REQUEST_ENDPOINT,
    PERMISSION_REQUIRE_PACKET,
)
from omu.identifier import Identifier

from omuserver.server import Server
from omuserver.session import Session


class PermissionExtension:
    def __init__(self, server: Server) -> None:
        server.packet_dispatcher.register(
            PERMISSION_REGISTER_PACKET,
            PERMISSION_REQUIRE_PACKET,
            PERMISSION_GRANT_PACKET,
        )
        server.packet_dispatcher.add_packet_handler(
            PERMISSION_REGISTER_PACKET,
            self.handle_register,
        )
        server.packet_dispatcher.add_packet_handler(
            PERMISSION_REQUIRE_PACKET,
            self.handle_require,
        )
        server.endpoints.bind_endpoint(
            PERMISSION_REQUEST_ENDPOINT,
            self.handle_request,
        )
        self.server = server
        self.request_key = 0

    async def handle_register(
        self, session: Session, permissions: list[PermissionType]
    ) -> None:
        for permission in permissions:
            if not permission.id.is_subpath_of(session.app.id):
                msg = (
                    f"Permission identifier {permission.id} "
                    f"is not a subpart of app identifier {session.app.id}"
                )
                raise ValueError(msg)
        self.server.permission_manager.register(*permissions, overwrite=True)

    async def handle_require(self, session: Session, permission_ids: list[Identifier]):
        if session.ready:
            raise ValueError("Session is already ready")
        if session.permission_handle.has_all(permission_ids):
            permissions = filter(
                None,
                [
                    self.server.permission_manager.get_permission(permission_id)
                    for permission_id in permission_ids
                ],
            )
            await session.send(PERMISSION_GRANT_PACKET, list(permissions))
            return
        if session.kind in {AppType.PLUGIN, AppType.DASHBOARD}:
            return

        async def task():
            permissions: list[PermissionType] = []
            for permission_id in permission_ids:
                permission = self.server.permission_manager.get_permission(
                    permission_id
                )
                if permission is None:
                    raise ValueError(f"Permission {permission_id} not registered")
                permissions.append(permission)

            request_id = self._get_next_request_key()
            accepted = await self.server.dashboard.request_permissions(
                PermissionRequestPacket(request_id, session.app, permissions)
            )
            if accepted:
                session.permission_handle.set_permissions(*[p.id for p in permissions])
                if not session.closed:
                    await session.send(PERMISSION_GRANT_PACKET, permissions)
            else:
                msg = f"Permission request denied (id={request_id})"
                raise PermissionDenied(msg)

        session.add_ready_task(task)

    async def handle_request(
        self, session: Session, permission_identifiers: list[Identifier]
    ): ...

    def _get_next_request_key(self) -> str:
        self.request_key += 1
        return f"{self.request_key}-{time.time_ns()}"
