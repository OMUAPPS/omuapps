from __future__ import annotations

import asyncio
import importlib.metadata
import importlib.util
import sys
import tempfile
from collections.abc import Mapping
from dataclasses import dataclass
from typing import (
    Protocol,
)

import aiohttp
import uv
from loguru import logger
from omu.extension.plugin import PackageInfo, PluginPackageInfo
from omu.plugin import InstallContext, Plugin
from packaging.specifiers import SpecifierSet
from packaging.version import Version

from omuserver.server import Server

from .plugin_instance import PluginInstance

PLUGIN_GROUP = "omu.plugins"


class PluginModule(Protocol):
    plugin: Plugin


class DependencyResolver:
    def __init__(self) -> None:
        self._dependencies: dict[str, SpecifierSet] = {}
        self._packages_distributions: Mapping[str, importlib.metadata.Distribution] = {}
        self._distributions_change_marked = True
        self.find_packages_distributions()

    async def fetch_package_info(self, package: str) -> PackageInfo:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://pypi.org/pypi/{package}/json") as response:
                return await response.json()

    async def get_installed_package_info(
        self, package: str
    ) -> PluginPackageInfo | None:
        try:
            package_info = importlib.metadata.distribution(package)
        except importlib.metadata.PackageNotFoundError:
            return None
        return PluginPackageInfo(
            package=package_info.name,
            version=package_info.version,
        )

    def format_dependencies(
        self, dependencies: Mapping[str, SpecifierSet | None]
    ) -> list[str]:
        args = []
        for dependency, specifier in dependencies.items():
            if specifier is not None:
                args.append(f"{dependency}{specifier}")
            else:
                args.append(dependency)
        return args

    async def update_requirements(self, requirements: dict[str, SpecifierSet]) -> None:
        if len(requirements) == 0:
            return
        with tempfile.NamedTemporaryFile(mode="wb", delete=True) as req_file:
            dependency_lines = self.format_dependencies(requirements)
            req_file.write("\n".join(dependency_lines).encode("utf-8"))
            req_file.flush()
            process = await asyncio.create_subprocess_exec(
                uv.find_uv_bin(),
                "pip",
                "install",
                "--upgrade",
                "-r",
                req_file.name,
                "--python",
                sys.executable,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
        if process.returncode != 0:
            logger.error(f"Failed to install dependencies: {stdout.decode()}")
            logger.error(f"Failed to install dependencies: {stderr.decode()}")
            return
        logger.info(f"Ran uv command: {(stdout or stderr).decode()}")

    def is_package_satisfied(self, package: str, specifier: SpecifierSet) -> bool:
        package_info = self._packages_distributions.get(package)
        if package_info is None:
            return False
        installed_version = Version(package_info.version)
        return installed_version in specifier

    def add_dependencies(self, dependencies: Mapping[str, str | None]) -> bool:
        changed = False
        for package, specifier in dependencies.items():
            specifier = SpecifierSet(specifier or "")
            package_info = self._packages_distributions.get(package)
            if package_info is None:
                self._dependencies[package] = specifier
                changed = True
                continue
            satisfied = self.is_package_satisfied(package, specifier)
            if satisfied:
                continue
            self._dependencies[package] = specifier or SpecifierSet()
            changed = True
        return changed

    def find_packages_distributions(
        self,
    ) -> Mapping[str, importlib.metadata.Distribution]:
        if not self._distributions_change_marked:
            return self._packages_distributions
        self._packages_distributions: Mapping[str, importlib.metadata.Distribution] = {
            dist.name: dist for dist in importlib.metadata.distributions()
        }
        self._distributions_change_marked = False
        return self._packages_distributions

    async def resolve(self) -> ResolveResult:
        packages_distributions = self.find_packages_distributions()
        requirements: dict[str, SpecifierSet] = {}
        update_distributions: dict[str, importlib.metadata.Distribution] = {}
        new_distributions: list[str] = []
        skipped: dict[str, SpecifierSet] = {}
        for dependency, specifier in self._dependencies.items():
            exist_package = packages_distributions.get(dependency)
            if exist_package is None:
                requirements[dependency] = specifier
                new_distributions.append(dependency)
                continue
            installed_version = Version(exist_package.version)
            specifier_set = self._dependencies[dependency]
            if installed_version in specifier_set:
                skipped[dependency] = specifier_set
                continue
            requirements[dependency] = specifier_set
            update_distributions[dependency] = exist_package
        if len(requirements) == 0:
            return ResolveResult(
                new_packages=new_distributions,
                updated_packages=update_distributions,
            )

        await self.update_requirements(requirements)
        self._distributions_change_marked = True
        logger.info(f"New packages: {new_distributions}")
        logger.info(f"Updated packages: {update_distributions}")
        return ResolveResult(
            new_packages=new_distributions,
            updated_packages=update_distributions,
        )


@dataclass(frozen=True, slots=True)
class ResolveResult:
    new_packages: list[str]
    updated_packages: dict[str, importlib.metadata.Distribution]


class PluginLoader:
    def __init__(self, server: Server) -> None:
        self._server = server
        self.instances: dict[str, PluginInstance] = {}
        server.event.stop += self.handle_server_stop

    async def handle_server_stop(self) -> None:
        for instance in self.instances.values():
            if instance.plugin.on_stop_server is not None:
                await instance.plugin.on_stop_server(self._server)

    async def run_plugins(self):
        self.load_plugins_from_entry_points()

        logger.info(f"Loaded plugins: {self.instances.keys()}")

        for instance in self.instances.values():
            await self.start_plugin(instance)

    def load_plugins_from_entry_points(self):
        entry_points = importlib.metadata.entry_points(group=PLUGIN_GROUP)
        for entry_point in entry_points:
            if entry_point.dist is None:
                raise ValueError(f"Invalid plugin: {entry_point} has no distribution")
            dist_name = entry_point.dist.name
            if dist_name in self.instances:
                raise ValueError(f"Duplicate plugin: {entry_point}")
            try:
                plugin = PluginInstance.from_entry_point(entry_point)
            except Exception as e:
                logger.opt(exception=e).error(f"Error loading plugin: {entry_point}")
                continue
            self.instances[dist_name] = plugin

    async def update_plugins(self, resolve_result: ResolveResult):
        restart_required = False
        plugins_to_start: list[PluginInstance] = []
        for new_package in resolve_result.new_packages:
            entry_points = tuple(
                importlib.metadata.entry_points(group=PLUGIN_GROUP, module=new_package)
            )
            if len(entry_points) == 0:
                continue
            if len(entry_points) > 1:
                raise ValueError(
                    f"Invalid plugin: {entry_points} has multiple entry points"
                )
            entry_point = entry_points[0]
            if entry_point.dist is None:
                raise ValueError(f"Invalid plugin: {entry_point} has no distribution")
            if entry_point.dist.name != new_package:
                continue
            instance = PluginInstance.from_entry_point(entry_point)
            self.instances[new_package] = instance
            ctx = InstallContext(
                server=self._server,
                new_distribution=entry_point.dist,
            )
            await instance.notify_install(ctx)
            if ctx.restart_required:
                restart_required = True
                logger.info(f"Plugin {instance.plugin} requires restart")
            else:
                plugins_to_start.append(instance)

        for updated_package, dist in resolve_result.updated_packages.items():
            instance = self.instances.get(updated_package)
            if instance is None:
                continue
            distribution = importlib.metadata.distribution(updated_package)
            await instance.reload()
            ctx = InstallContext(
                server=self._server,
                old_distribution=distribution,
                new_distribution=dist,
                old_plugin=instance.plugin,
            )
            await instance.notify_update(ctx)
            await instance.notify_install(ctx)
            if ctx.restart_required:
                restart_required = True
                logger.info(f"Plugin {instance.plugin} requires restart")
            else:
                plugins_to_start.append(instance)

        if restart_required:
            await self._server.restart()
            return

        for instance in plugins_to_start:
            await self.start_plugin(instance)

    async def start_plugin(self, instance: PluginInstance):
        try:
            if instance.plugin.on_start_server is not None:
                await instance.plugin.on_start_server(self._server)

            await instance.start(self._server)
        except Exception as e:
            logger.opt(exception=e).error(f"Error starting plugin: {instance.plugin}")
