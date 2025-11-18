from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, TypedDict

from yarl import URL

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier
from omu.serializer import Serializer

if TYPE_CHECKING:
    from omu.omu import Omu

ASSET_EXTENSION_TYPE = ExtensionType("asset", lambda client: AssetExtension(client))


@dataclass(frozen=True, slots=True)
class Asset:
    id: Identifier
    buffer: bytes


class FileSerializer:
    @classmethod
    def serialize(cls, item: Asset) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uint8_array(item.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> Asset:
        with ByteReader(item) as reader:
            identifier = Identifier.from_key(reader.read_string())
            value = reader.read_uint8_array()
        return Asset(identifier, value)


class FileArraySerializer:
    @classmethod
    def serialize(cls, item: list[Asset]) -> bytes:
        writer = ByteWriter()
        writer.write_uleb128(len(item))
        for file in item:
            writer.write_string(file.id.key())
            writer.write_uint8_array(file.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> list[Asset]:
        with ByteReader(item) as reader:
            count = reader.read_uleb128()
            files: list[Asset] = []
            for _ in range(count):
                identifier = Identifier.from_key(reader.read_string())
                value = reader.read_uint8_array()
                files.append(Asset(identifier, value))
        return files


ASSET_PERMISSION_ID = ASSET_EXTENSION_TYPE
ASSET_UPLOAD_ENDPOINT = EndpointType[Asset, Identifier].create_serialized(
    ASSET_EXTENSION_TYPE,
    "upload",
    request_serializer=FileSerializer,
    response_serializer=Serializer.model(Identifier).to_json(),
    permission_id=ASSET_PERMISSION_ID,
)
ASSET_UPLOAD_MANY_ENDPOINT = EndpointType[list[Asset], list[Identifier]].create_serialized(
    ASSET_EXTENSION_TYPE,
    "upload_many",
    request_serializer=FileArraySerializer,
    response_serializer=Serializer.model(Identifier).to_array().to_json(),
    permission_id=ASSET_PERMISSION_ID,
)
ASSET_DOWNLOAD_ENDPOINT = EndpointType[Identifier, Asset].create_serialized(
    ASSET_EXTENSION_TYPE,
    "download",
    request_serializer=Serializer.model(Identifier).to_json(),
    response_serializer=FileSerializer,
    permission_id=ASSET_PERMISSION_ID,
)
ASSET_DOWNLOAD_MANY_ENDPOINT = EndpointType[list[Identifier], list[Asset]].create_serialized(
    ASSET_EXTENSION_TYPE,
    "download_many",
    request_serializer=Serializer.model(Identifier).to_array().to_json(),
    response_serializer=FileArraySerializer,
    permission_id=ASSET_PERMISSION_ID,
)
ASSET_DELETE_ENDPOINT = EndpointType[Identifier, None].create_serialized(
    ASSET_EXTENSION_TYPE,
    "delete",
    request_serializer=Serializer.model(Identifier).to_json(),
    response_serializer=Serializer.json(),
    permission_id=ASSET_PERMISSION_ID,
)


class GenerateAssetTokenResponse(TypedDict):
    token: str


ASSET_GENERATE_TOKEN_ENDPOINT = EndpointType[Any, GenerateAssetTokenResponse].create_json(
    ASSET_EXTENSION_TYPE,
    name="token_generate",
    permission_id=ASSET_PERMISSION_ID,
)


class AssetExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return ASSET_EXTENSION_TYPE

    def __init__(self, omu: Omu) -> None:
        self.omu = omu
        self.asset_token: str | None = None
        omu.network.add_task(self._on_task)

    async def _on_task(self):
        if self.omu.permissions.has(ASSET_PERMISSION_ID):
            result = await self.omu.endpoints.call(ASSET_GENERATE_TOKEN_ENDPOINT, {})
            self.asset_token = result["token"]

    async def upload(self, file: Asset) -> Identifier:
        return await self.omu.endpoints.call(ASSET_UPLOAD_ENDPOINT, file)

    async def upload_many(self, files: list[Asset]) -> list[Identifier]:
        return await self.omu.endpoints.call(ASSET_UPLOAD_MANY_ENDPOINT, files)

    async def download(self, identifier: Identifier) -> Asset:
        return await self.omu.endpoints.call(ASSET_DOWNLOAD_ENDPOINT, identifier)

    async def download_many(self, identifiers: list[Identifier]) -> list[Asset]:
        return await self.omu.endpoints.call(ASSET_DOWNLOAD_MANY_ENDPOINT, identifiers)

    async def delete(self, identifier: Identifier) -> None:
        await self.omu.endpoints.call(ASSET_DELETE_ENDPOINT, identifier)

    def url(self, identifier: Identifier) -> str:
        if self.asset_token is None:
            raise Exception("Asset token is not set")
        address = self.omu.network.address
        return str(
            URL.build(
                scheme="https" if address.secure else "http",
                host=address.host,
                port=address.port,
                path="/asset",
                query={
                    "asset_token": self.asset_token,
                    "id": identifier.key(),
                },
            )
        )

    def proxy(self, url: str) -> str:
        if self.asset_token is None:
            raise Exception("Asset token is not set")
        address = self.omu.network.address
        return str(
            URL.build(
                scheme="https" if address.secure else "http",
                host=address.host,
                port=address.port,
                path="/asset",
                query={
                    "asset_token": self.asset_token,
                    "url": url,
                },
            )
        )
