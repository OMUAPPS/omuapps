from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, TypedDict

import aiohttp
from omu.app import App, AppJson, DependencySpecifier
from omu.identifier import Identifier
from omu.result import Err, Ok, Result
from yarl import URL

if TYPE_CHECKING:
    from omuserver.server import Server


class InstallRequest(TypedDict):
    index: str
    id: str


class AppIndexRegistryJSON(TypedDict):
    id: str
    apps: dict[str, AppJson]


@dataclass(frozen=True, slots=True)
class AppIndexRegistry:
    id: Identifier
    apps: dict[Identifier, App]

    @staticmethod
    def from_json(json: AppIndexRegistryJSON) -> AppIndexRegistry:
        id = Identifier.from_key(json["id"])
        apps: dict[Identifier, App] = {}
        for id_str, app_json in json["apps"].items():
            id = Identifier.from_key(id_str)
            app = App.from_json(app_json)
            if not id.is_namepath_equal(app.id, 0):
                raise AssertionError(f"App ID does not match the ID in the index. {app.id} != {id}")
            apps[id] = app
        return AppIndexRegistry(
            id=id,
            apps=apps,
        )

    @staticmethod
    def resolve_index_by_specifier(
        server: Server, id: Identifier, specifier: DependencySpecifier | str
    ) -> Result[URL, str]:
        if not isinstance(specifier, str):
            index_url = specifier.get("index")
            if index_url is not None:
                mapped_url = server.network.get_mapped_url(URL(index_url))
                index_id = Identifier.from_url(mapped_url)
                if not index_id.is_namepath_equal(id, 0):
                    return Err(f"Invalid Index ID: {index_id.namespace} != {id.namespace}")
                return Ok(URL(index_url))
        url = id.into_url()
        url.path = "/_omuapps.json"
        return Ok(url)

    @classmethod
    async def try_fetch(cls, url: URL) -> Result[AppIndexRegistry, str]:
        async with aiohttp.ClientSession() as client:
            try:
                async with client.get(
                    url,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    response.raise_for_status()
                    data: AppIndexRegistryJSON = await response.json()
                    try:
                        index = AppIndexRegistry.from_json(data)
                        return Ok(index)
                    except AssertionError as e:
                        return Err(str(e))

            except aiohttp.ClientError as e:
                return Err(str(e))
