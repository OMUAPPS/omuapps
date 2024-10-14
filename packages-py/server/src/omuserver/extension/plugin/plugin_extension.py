from __future__ import annotations

import asyncio
import time

from omu.extension.dashboard.packets import PluginRequestPacket
from omu.extension.plugin import PackageInfo
from omu.extension.plugin.plugin_extension import (
    PLUGIN_ALLOWED_PACKAGE_TABLE,
    PLUGIN_REQUIRE_PACKET,
)

from omuserver.server import Server
from omuserver.session import Session
from omuserver.session.session import SessionType

from .plugin_loader import DependencyResolver, PluginLoader


class PluginExtension:
    def __init__(self, server: Server) -> None:
        self.server = server
        server.packet_dispatcher.register(
            PLUGIN_REQUIRE_PACKET,
        )
        server.packet_dispatcher.add_packet_handler(
            PLUGIN_REQUIRE_PACKET,
            self.handle_require_packet,
        )
        server.network.event.start += self.on_network_start
        self.request_id = 0
        self.lock = asyncio.Lock()
        self.loader = PluginLoader(server)
        self.dependency_resolver = DependencyResolver()
        self.allowed_packages = server.tables.register(PLUGIN_ALLOWED_PACKAGE_TABLE)

    async def on_network_start(self) -> None:
        await self.loader.run_plugins()

    def _get_next_request_id(self) -> str:
        self.request_id += 1
        return f"{self.request_id}-{time.time_ns()}"

    async def open_request_plugin_dialog(
        self, session: Session, packages: dict[str, str | None]
    ) -> None:
        to_request: list[PackageInfo] = []
        for package in packages.keys():
            package_info = await self.dependency_resolver.get_installed_package_info(
                package
            )
            if package_info is None:
                package_info = await self.dependency_resolver.fetch_package_info(
                    package
                )
                to_request.append(package_info)
                continue
            await self.allowed_packages.add(package_info)
        if len(to_request) == 0:
            return
        request = PluginRequestPacket(
            request_id=self._get_next_request_id(),
            app=session.app,
            packages=to_request,
        )
        accepted = await self.server.dashboard.request_plugins(request)
        if not accepted:
            raise Exception("Request was not accepted")

    async def handle_require_packet(
        self, session: Session, packages: dict[str, str | None]
    ) -> None:
        if not packages:
            return

        async def task():
            if session.kind != SessionType.DASHBOARD:
                await self.open_request_plugin_dialog(session, packages)

            self.dependency_resolver.find_packages_distributions()
            changed = self.dependency_resolver.add_dependencies(packages)

            if not changed:
                return

            async with self.lock:
                resolve_result = await self.dependency_resolver.resolve()
                await self.loader.update_plugins(resolve_result)

        session.add_ready_task(task)
