from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING

from loguru import logger
from omu.api.dashboard.packets import PluginRequestPacket
from omu.api.plugin import PackageInfo
from omu.api.plugin.extension import (
    PLUGIN_ALLOWED_PACKAGE_TABLE,
    PLUGIN_RELOAD_ENDPOINT_TYPE,
    PLUGIN_REQUIRE_PACKET,
    ReloadOptions,
    ReloadResult,
)
from omu.app import AppType
from omu.network.packet.packet_types import DisconnectType
from packaging.specifiers import SpecifierSet

from omuserver.session import Session

from .loader import DependencyResolver, PluginLoader, RequiredVersionTooOld
from .permissions import PLUGIN_MANAGE_PERMISSION, PLUGIN_READ_PERMISSION

if TYPE_CHECKING:
    from omuserver.server import Server
RESTART = True


class PluginExtension:
    def __init__(self, server: Server) -> None:
        self.allowed_packages = server.tables.register(PLUGIN_ALLOWED_PACKAGE_TABLE)
        server.security.register_permission(PLUGIN_MANAGE_PERMISSION, PLUGIN_READ_PERMISSION)
        server.packets.register(PLUGIN_REQUIRE_PACKET)
        server.tables.register(PLUGIN_ALLOWED_PACKAGE_TABLE)
        server.packets.bind(PLUGIN_REQUIRE_PACKET, self.handle_require)
        server.endpoints.bind(PLUGIN_RELOAD_ENDPOINT_TYPE, self.handle_reload)
        server.event.start += self.on_network_start
        server.event.stop += self.on_stop
        self.server = server
        self.request_id = 0
        self.lock = asyncio.Lock()
        self.loader = PluginLoader(server)
        self.dependency_resolver = DependencyResolver()

    async def on_network_start(self) -> None:
        await self.loader.run_plugins()

    async def on_stop(self) -> None:
        try:
            await self.loader.stop_plugins()
        except Exception as e:
            logger.opt(exception=e).error("Error stopping plugins")

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

    async def handle_require(self, session: Session, requirements: dict[str, str | None]) -> None:
        if not requirements:
            return
        satisfied = self.dependency_resolver.is_requirements_satisfied(
            {k: SpecifierSet(v) if v else None for k, v in requirements.items()}
        )
        if satisfied:
            return
        if session.kind == AppType.REMOTE:
            await session.disconnect(DisconnectType.PERMISSION_DENIED, "Remote apps cannot require plugins")
            return

        async def task():
            if session.kind != AppType.DASHBOARD:
                await self.open_request_plugin_dialog(session, requirements)

            self.dependency_resolver.find_packages_distributions()
            try:
                changed = await self.dependency_resolver.add_dependencies(requirements)
            except RequiredVersionTooOld as e:
                await session.disconnect(DisconnectType.INVALID_VERSION, str(e))
                return

            if not changed:
                return

            async with self.lock:
                resolve_result = await self.dependency_resolver.resolve()
                if resolve_result.is_err is True:
                    await session.disconnect(DisconnectType.INVALID_VERSION, resolve_result.err)
                    return
                if RESTART:
                    await self.server.restart()
                else:
                    await self.loader.update_plugins(resolve_result.value)

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
