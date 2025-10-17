from __future__ import annotations

import importlib
import importlib.metadata
from dataclasses import dataclass

from loguru import logger
from omu.result import Err, Ok, Result

from .loader import normalize_package_name

PLUGIN_GROUP = "omu.plugins"


@dataclass(frozen=True, slots=True)
class PluginEntry:
    key: str
    name: str
    entry_point: importlib.metadata.EntryPoint
    dist: importlib.metadata.Distribution

    @classmethod
    def from_entrypoint(cls, entry_point: importlib.metadata.EntryPoint) -> Result[PluginEntry, str]:
        assert entry_point.dist is not None
        if entry_point.dist is None:
            return Err(f"Invalid plugin: {entry_point} has no distribution")
        package = entry_point.dist.name
        return Ok(
            PluginEntry(
                key=entry_point.value,
                name=normalize_package_name(package),
                entry_point=entry_point,
                dist=entry_point.dist,
            )
        )

    @classmethod
    def retrieve_from_distribution(
        cls,
        distribution: importlib.metadata.Distribution,
    ) -> dict[str, PluginEntry]:
        entries: dict[str, PluginEntry] = {}
        entry_points = distribution.entry_points
        for entry_point in entry_points:
            if entry_point.group != PLUGIN_GROUP:
                continue
            match PluginEntry.from_entrypoint(entry_point):
                case Ok(entry):
                    entries[entry.key] = entry
                case Err(message):
                    logger.warning(f"Invalid plugin {entry_point}: {message}")
        return entries

    @classmethod
    def retrieve_plugin_entries(cls) -> dict[str, PluginEntry]:
        plugin_entries: dict[str, PluginEntry] = {}
        entry_points = importlib.metadata.entry_points(group=PLUGIN_GROUP)
        for entry_point in entry_points:
            match PluginEntry.from_entrypoint(entry_point):
                case Ok(entry):
                    if entry.name in plugin_entries:
                        logger.warning(f"Duplicate plugin: {entry_point}")
                        continue
                    plugin_entries[entry.name] = entry
                case Err(message):
                    logger.warning(f"Invalid plugin {entry_point}: {message}")
        return plugin_entries
