from __future__ import annotations

import asyncio
import importlib.metadata
import sys
import tempfile
from collections.abc import Mapping
from dataclasses import dataclass
from typing import (
    TYPE_CHECKING,
    Protocol,
)

import aiohttp
import uv
from loguru import logger
from omu.api.plugin import PackageInfo, PluginPackageInfo
from omu.plugin import InstallContext, Plugin
from omu.result import Err, Ok, Result, is_err
from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet
from packaging.version import Version

from omuserver.helper import normalize_package_name

from .entry import PluginEntry
from .instance import PluginInstance

if TYPE_CHECKING:
    from omuserver.server import Server


class PluginModule(Protocol):
    plugin: Plugin


class RequiredVersionTooOld(Exception):
    pass


class DependencyResolver:
    def __init__(self) -> None:
        self._dependencies: dict[str, SpecifierSet] = {}
        self._packages_distributions: Mapping[str, importlib.metadata.Distribution] = {}
        self._package_info_cache: dict[str, PackageInfo] = {}
        self._distributions_change_marked = True
        self.find_packages_distributions()

    async def fetch_package_info(self, package: str) -> PackageInfo:
        if package in self._package_info_cache:
            return self._package_info_cache[package]
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://pypi.org/pypi/{package}/json") as response:
                package_info = PackageInfo(await response.json())
                self._package_info_cache[package] = package_info
                return package_info

    async def get_installed_package_info(self, package: str) -> PluginPackageInfo | None:
        try:
            package_info = importlib.metadata.distribution(package)
        except importlib.metadata.PackageNotFoundError:
            return None
        return PluginPackageInfo(
            package=package_info.name,
            version=package_info.version,
        )

    def format_dependencies(self, dependencies: Mapping[str, SpecifierSet | None]) -> list[str]:
        args = []
        for dependency, specifier in dependencies.items():
            if specifier is not None:
                args.append(f"{dependency}{specifier}")
            else:
                args.append(dependency)
        return args

    async def install_requirements(self, requirements: dict[str, SpecifierSet]) -> Result[None, str]:
        if len(requirements) == 0:
            return Ok(None)
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
            return Err(f"Failed to install dependencies: stdout={stdout.decode()} stderr={stderr.decode()}")
        logger.info(f"Ran uv command: {(stdout or stderr).decode()}")
        return Ok(None)

    def is_package_satisfied(self, package: str, specifier: SpecifierSet | None) -> bool:
        package_info = self._packages_distributions.get(package)
        if package_info is None:
            return False
        if specifier is None:
            return True
        installed_version = Version(package_info.version)
        return installed_version in specifier

    def is_requirements_satisfied(self, requirements: dict[str, SpecifierSet | None]) -> bool:
        for package, specifier in requirements.items():
            if not self.is_package_satisfied(package, specifier):
                return False
        return True

    def _get_minimum_version(self, specifier: SpecifierSet) -> Version:
        minimum_version = Version("0")
        for spec in specifier:
            if spec.operator == ">=":
                minimum_version = max(minimum_version, Version(spec.version))
            elif spec.operator == "==":
                minimum_version = Version(spec.version)
        return minimum_version

    def is_package_version_too_old(self, package: str, specifier: SpecifierSet) -> bool:
        exist_package = self._packages_distributions.get(package)
        if exist_package is None:
            return False
        exist_version = Version(exist_package.version)
        minimum_version = self._get_minimum_version(specifier)
        return minimum_version < exist_version

    async def find_best_compatible_version(self, package: str, specifier: SpecifierSet) -> Version:
        package_info = await self.fetch_package_info(package)
        versions: list[Version] = sorted(map(Version, package_info["releases"].keys()))  # [0.1.0, 0.1.1, 0.2.0, 2.0.0]
        for version in versions:
            if version in specifier:
                return version
        raise ValueError(f"No compatible version found for {package} with specifier {specifier}")

    async def add_dependencies(self, dependencies: Mapping[str, str | None]) -> bool:
        changed = False
        new_dependencies: dict[str, SpecifierSet] = {}
        for package, specifier in dependencies.items():
            specifier = SpecifierSet(specifier or "")
            package_info = self._packages_distributions.get(package)
            if package_info is None:
                new_dependencies[package] = specifier
                changed = True
                continue
            satisfied = self.is_package_satisfied(package, specifier)
            if satisfied:
                continue
            too_old = self.is_package_version_too_old(package, specifier)
            if too_old:
                raise RequiredVersionTooOld(f"Package {package} is too old: {package_info.version}")
            best_version = await self.find_best_compatible_version(package, specifier)
            new_dependencies[package] = SpecifierSet(f"=={best_version}")
            changed = True
        self._dependencies.update(new_dependencies)
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

    async def resolve(self) -> Result[ResolveResult, str]:
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
            return Ok(ResolveResult(new_packages=new_distributions, updated_packages=update_distributions))

        result = await self.install_requirements(requirements)
        if is_err(result):
            return Err(result.err)
        self._distributions_change_marked = True
        logger.info(f"New packages: {new_distributions}")
        logger.info(f"Updated packages: {update_distributions}")
        return Ok(ResolveResult(new_packages=new_distributions, updated_packages=update_distributions))

    def solve_dependency_order(self, entrypoints: dict[str, PluginEntry]):
        # sort dependenies by entrypoint.dist.requires
        normalized_map = {normalize_package_name(k): k for k in entrypoints.keys()}
        sorted_packages: list[str] = []
        visited: set[str] = set()
        temp_mark: set[str] = set()

        def visit(package: str):
            if package in visited:
                return
            if package in temp_mark:
                raise Exception(f"Cyclic dependency detected: {' -> '.join(temp_mark)} -> {package}")
            temp_mark.add(package)
            entry_point = entrypoints.get(package)
            if entry_point is not None and entry_point.dist is not None:
                for req in entry_point.dist.requires or []:
                    requirement = Requirement(req)
                    dep_name = normalize_package_name(requirement.name)
                    dep_package = normalized_map.get(dep_name)
                    if dep_package is not None:
                        visit(dep_package)
            temp_mark.remove(package)
            visited.add(package)
            sorted_packages.append(package)

        for pkg in entrypoints.keys():
            visit(pkg)
        return [(pkg, entrypoints[pkg]) for pkg in sorted_packages]


@dataclass(frozen=True, slots=True)
class ResolveResult:
    new_packages: list[str]
    updated_packages: dict[str, importlib.metadata.Distribution]


class PluginLoader:
    def __init__(
        self,
        server: Server,
        resolver: DependencyResolver,
    ) -> None:
        self._server = server
        self.instances: dict[str, PluginInstance] = {}
        self.resolver = resolver

    async def run_plugins(self):
        ordered_entries = self.resolver.solve_dependency_order(PluginEntry.retrieve_plugin_entries())
        for package, entry in ordered_entries:
            if package in self.instances:
                logger.warning(f"Duplicate plugin {package}: {entry}")
                continue
            match PluginInstance.try_load(entry):
                case Ok(instance):
                    self.instances[entry.key] = instance
                case Err(message):
                    logger.warning(f"Failed to load plugin {entry.name}: {message}")

        logger.info(f"Loaded plugins: {', '.join(self.instances.keys())}")

        for instance in self.instances.values():
            await instance.start(self._server)

    async def update_plugins(self, resolve_result: ResolveResult):
        new_entries: dict[str, PluginEntry] = {}
        updated_entries: dict[str, PluginEntry] = {}
        for package in resolve_result.new_packages:
            distribution = importlib.metadata.distribution(package)
            for key, entry in PluginEntry.retrieve_from_distribution(distribution).items():
                if key in new_entries:
                    logger.error(f"Duplicate plugin {key} during installation")
                    continue
                new_entries[key] = entry

        for package in resolve_result.updated_packages.keys():
            distribution = importlib.metadata.distribution(package)
            for key, entry in PluginEntry.retrieve_from_distribution(distribution).items():
                if key in updated_entries:
                    logger.error(f"Duplicate plugin {key} during update")
                    continue
                updated_entries[key] = entry

        instances_to_start: list[PluginInstance] = []
        restart_requires: list[str] = []

        for key, entry in self.resolver.solve_dependency_order(new_entries):
            if key in self.instances:
                logger.error(f"Plugin {key} already exists during installation")
                continue
            match PluginInstance.try_load(entry):
                case Err(message):
                    logger.error(f"Error loading plugin {key}: {message}")
                    continue
                case Ok(instance):
                    ...
            self.instances[key] = instance
            ctx = InstallContext(
                server=self._server,
                new_distribution=entry.dist,
            )
            await instance.notify_install(ctx)
            if ctx.restart_required:
                restart_requires.append(key)
            instances_to_start.append(instance)

        for key, entry in self.resolver.solve_dependency_order(updated_entries):
            instance = self.instances.get(key)
            if instance is None:
                continue
            await instance.terminate(self._server)
            await instance.reload()
            ctx = InstallContext(
                server=self._server,
                old_distribution=instance.entry.dist,
                new_distribution=entry.dist,
                old_plugin=instance.plugin,
            )
            await instance.notify_update(ctx)
            await instance.notify_install(ctx)
            if ctx.restart_required:
                restart_requires.append(key)
            instances_to_start.append(instance)

        if restart_requires:
            logger.info(f"Restart required for plugins: {restart_requires}")
            await self._server.restart()
            return

        for instance in instances_to_start:
            await instance.start(self._server)

    async def stop_plugins(self):
        for instance in self.instances.values():
            await instance.terminate(self._server)
        self.instances.clear()
