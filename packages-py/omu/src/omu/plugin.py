from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from importlib.metadata import Distribution
from typing import TYPE_CHECKING, Protocol

from omu.omu import Omu

if TYPE_CHECKING:
    from omuserver.server import Server

from omu.helper import AsyncCallback


class PluginContext(Protocol):
    server: Server


class InstallContext(PluginContext):
    def __init__(
        self,
        server: Server,
        old_distribution: Distribution | None = None,
        new_distribution: Distribution | None = None,
        old_plugin: Plugin | None = None,
    ):
        self.server: Server = server
        self.old_distribution: Distribution | None = old_distribution
        self.new_distribution: Distribution | None = new_distribution
        self.plugin: Plugin | None = old_plugin
        self.restart_required: bool = False

    def require_restart(self):
        self.restart_required = True


@dataclass(frozen=True, slots=True)
class UninstallContext(PluginContext):
    server: Server
    distribution: Distribution | None
    plugin: Plugin | None


@dataclass(frozen=True, slots=True)
class StartContext(PluginContext):
    server: Server


@dataclass(frozen=True, slots=True)
class StopContext(PluginContext):
    server: Server


@dataclass(frozen=True, slots=True)
class Plugin:
    get_client: Callable[[], Omu] | None = None
    on_start: AsyncCallback[[StartContext]] | None = None
    on_stop: AsyncCallback[[StopContext]] | None = None
    on_install: AsyncCallback[[InstallContext]] | None = None
    on_uninstall: AsyncCallback[[UninstallContext]] | None = None
    on_update: AsyncCallback[[InstallContext]] | None = None
    isolated: bool = True

    def __post_init__(self):
        if self.isolated:
            assert self.get_client is not None, "Isolated plugins must have get_client"
