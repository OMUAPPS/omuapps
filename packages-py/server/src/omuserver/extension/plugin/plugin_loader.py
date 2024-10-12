from __future__ import annotations

import asyncio
import importlib.metadata
import importlib.util
import sys
import tempfile
from collections.abc import Mapping
from typing import (
    Protocol,
)

import aiohttp
import uv
from loguru import logger
from omu.extension.plugin import PackageInfo, PluginPackageInfo
from omu.plugin import Plugin
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
        self._packages_distributions_changed = True
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
            logger.error(f"Error running uv command: {stderr}")
            return
        logger.info(f"Ran uv command: {(stdout or stderr).decode()}")

    def is_package_satisfied(self, package: str, specifier: SpecifierSet) -> bool:
        package_info = self._packages_distributions.get(package)
        if package_info is None:
            return False
        installed_version = Version(package_info.version)
        return installed_version in specifier

    def add_dependencies(self, dependencies: Mapping[str, SpecifierSet | None]) -> bool:
        changed = False
        for dependency, specifier in dependencies.items():
            if dependency not in self._dependencies:
                if specifier is not None and self.is_package_satisfied(
                    dependency, specifier
                ):
                    continue
                self._dependencies[dependency] = specifier or SpecifierSet()
                changed = True
                continue
            if specifier is not None:
                specifier_set = self._dependencies[dependency]
                if specifier_set != specifier:
                    changed = True
                specifier_set &= specifier
                continue
        return changed

    def find_packages_distributions(
        self,
    ) -> Mapping[str, importlib.metadata.Distribution]:
        if not self._packages_distributions_changed:
            return self._packages_distributions
        self._packages_distributions: Mapping[str, importlib.metadata.Distribution] = {
            dist.name: dist for dist in importlib.metadata.distributions()
        }
        self._packages_distributions_changed = False
        return self._packages_distributions

    async def resolve(self):
        packages_distributions = self.find_packages_distributions()
        requirements: dict[str, SpecifierSet] = {}
        skipped: dict[str, SpecifierSet] = {}
        for dependency, specifier in self._dependencies.items():
            package = packages_distributions.get(dependency)
            if package is None:
                requirements[dependency] = specifier
                continue
            distribution = packages_distributions[package.name]
            installed_version = Version(distribution.version)
            specifier_set = self._dependencies[dependency]
            if installed_version in specifier_set:
                skipped[dependency] = specifier_set
                continue
            requirements[dependency] = specifier_set
        if len(requirements) == 0:
            return

        await self.update_requirements(requirements)
        self._packages_distributions_changed = True


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
            plugin_key = entry_point.dist.name
            if plugin_key in self.instances:
                raise ValueError(f"Duplicate plugin: {entry_point}")
            try:
                plugin = PluginInstance.from_entry_point(entry_point)
            except Exception as e:
                logger.opt(exception=e).error(f"Error loading plugin: {entry_point}")
                continue
            self.instances[plugin_key] = plugin

    async def load_updated_plugins(self):
        entry_points = importlib.metadata.entry_points(group=PLUGIN_GROUP)
        detected_plugins = {
            entry_point.dist.name for entry_point in entry_points if entry_point.dist
        }
        logger.info(f"Detected plugins: {detected_plugins}")
        for entry_point in entry_points:
            if entry_point.dist is None:
                raise ValueError(f"Invalid plugin: {entry_point} has no distribution")
            plugin_key = entry_point.dist.name
            if plugin_key in self.instances:
                continue
            instance = PluginInstance.from_entry_point(entry_point)
            self.instances[plugin_key] = instance
            await self.start_plugin(instance)

    async def start_plugin(self, instance: PluginInstance):
        try:
            if instance.plugin.on_start_server is not None:
                await instance.plugin.on_start_server(self._server)

            await instance.start(self._server)
        except Exception as e:
            logger.opt(exception=e).error(f"Error starting plugin: {instance.plugin}")
