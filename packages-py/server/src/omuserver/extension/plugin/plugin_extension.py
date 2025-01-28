from __future__ import annotations

import asyncio
import time

from omu.app import AppType
from omu.extension.dashboard.packets import PluginRequestPacket
from omu.extension.plugin import PackageInfo
from omu.extension.plugin.plugin_extension import (
    PLUGIN_ALLOWED_PACKAGE_TABLE,
    PLUGIN_RELOAD_ENDPOINT_TYPE,
    PLUGIN_REQUIRE_PACKET,
    ReloadOptions,
    ReloadResult,
)

from omuserver.server import Server
from omuserver.session import Session

from .plugin_loader import DependencyResolver, PluginLoader
from .plugin_permissions import (
    PLUGIN_MANAGE_PERMISSION,
    PLUGIN_READ_PERMISSION,
)


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
        server.permission_manager.register(
            PLUGIN_MANAGE_PERMISSION,
            PLUGIN_READ_PERMISSION,
        )
        server.endpoints.bind_endpoint(PLUGIN_RELOAD_ENDPOINT_TYPE, self.handle_reload)
        server.network.event.start += self.on_network_start
        server.event.stop += self.on_stop
        self.request_id = 0
        self.lock = asyncio.Lock()
        self.loader = PluginLoader(server)
        self.dependency_resolver = DependencyResolver()
        self.allowed_packages = server.tables.register(PLUGIN_ALLOWED_PACKAGE_TABLE)

    async def on_network_start(self) -> None:
        await self.loader.run_plugins()

    async def on_stop(self) -> None:
        await self.loader.stop_plugins()

    def _get_next_request_id(self) -> str:
        self.request_id += 1
        return f"{self.request_id}-{time.time_ns()}"

    async def open_request_plugin_dialog(self, session: Session, packages: dict[str, str | None]) -> None:
        to_request: list[PackageInfo] = []
        for package in packages.keys():
            package_info = await self.dependency_resolver.get_installed_package_info(package)
            if package_info is None:
                package_info = await self.dependency_resolver.fetch_package_info(package)
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

    async def handle_require_packet(self, session: Session, packages: dict[str, str | None]) -> None:
        if not packages:
            return

        async def task():
            if session.kind != AppType.DASHBOARD:
                await self.open_request_plugin_dialog(session, packages)

            self.dependency_resolver.find_packages_distributions()
            changed = self.dependency_resolver.add_dependencies(packages)

            if not changed:
                return

            async with self.lock:
                resolve_result = await self.dependency_resolver.resolve()
                await self.loader.update_plugins(resolve_result)

        session.add_ready_task(task)

    async def handle_reload(self, session: Session, options: ReloadOptions) -> ReloadResult:
        packages = self.loader.instances
        if options.get("packages") is not None:
            filters = options["packages"] or []
            packages = {name: version for name, version in packages.items() if name in filters}
        for package in packages.values():
            await package.terminate(self.server)
            await package.reload()
            await package.start(self.server)
        return {
            "packages": {},
        }
