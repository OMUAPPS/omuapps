from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter
from omu.client import Client
from omu.extension import Extension, ExtensionType
from omu.extension.endpoint import EndpointType
from omu.identifier import Identifier
from omu.serializer import Serializer

ASSET_EXTENSION_TYPE = ExtensionType(
    "asset",
    lambda client: AssetExtension(client),
    lambda: [],
)


@dataclass(frozen=True, slots=True)
class Asset:
    id: Identifier
    buffer: bytes


class FileSerializer:
    @classmethod
    def serialize(cls, item: Asset) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_byte_array(item.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> Asset:
        with ByteReader(item) as reader:
            identifier = Identifier.from_key(reader.read_string())
            value = reader.read_byte_array()
        return Asset(identifier, value)


class FileArraySerializer:
    @classmethod
    def serialize(cls, item: list[Asset]) -> bytes:
        writer = ByteWriter()
        writer.write_int(len(item))
        for file in item:
            writer.write_string(file.id.key())
            writer.write_byte_array(file.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> list[Asset]:
        with ByteReader(item) as reader:
            count = reader.read_int()
            files: list[Asset] = []
            for _ in range(count):
                identifier = Identifier.from_key(reader.read_string())
                value = reader.read_byte_array()
                files.append(Asset(identifier, value))
        return files


ASSET_UPLOAD_PERMISSION_ID = ASSET_EXTENSION_TYPE / "upload"
ASSET_UPLOAD_ENDPOINT = EndpointType[Asset, Identifier].create_serialized(
    ASSET_EXTENSION_TYPE,
    "upload",
    request_serializer=FileSerializer,
    response_serializer=Serializer.model(Identifier).to_json(),
    permission_id=ASSET_UPLOAD_PERMISSION_ID,
)
ASSET_UPLOAD_MANY_ENDPOINT = EndpointType[list[Asset], list[Identifier]].create_serialized(
    ASSET_EXTENSION_TYPE,
    "upload_many",
    request_serializer=FileArraySerializer,
    response_serializer=Serializer.model(Identifier).to_array().to_json(),
    permission_id=ASSET_UPLOAD_PERMISSION_ID,
)
ASSET_DOWNLOAD_PERMISSION_ID = ASSET_EXTENSION_TYPE / "download"
ASSET_DOWNLOAD_ENDPOINT = EndpointType[Identifier, Asset].create_serialized(
    ASSET_EXTENSION_TYPE,
    "download",
    request_serializer=Serializer.model(Identifier).to_json(),
    response_serializer=FileSerializer,
    permission_id=ASSET_DOWNLOAD_PERMISSION_ID,
)
ASSET_DOWNLOAD_MANY_ENDPOINT = EndpointType[list[Identifier], list[Asset]].create_serialized(
    ASSET_EXTENSION_TYPE,
    "download_many",
    request_serializer=Serializer.model(Identifier).to_array().to_json(),
    response_serializer=FileArraySerializer,
    permission_id=ASSET_DOWNLOAD_PERMISSION_ID,
)


class AssetExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return ASSET_EXTENSION_TYPE

    def __init__(self, client: Client) -> None:
        self.client = client

    async def upload(self, file: Asset) -> Identifier:
        return await self.client.endpoints.call(ASSET_UPLOAD_ENDPOINT, file)

    async def upload_many(self, files: list[Asset]) -> list[Identifier]:
        return await self.client.endpoints.call(ASSET_UPLOAD_MANY_ENDPOINT, files)

    async def download(self, identifier: Identifier) -> Asset:
        return await self.client.endpoints.call(ASSET_DOWNLOAD_ENDPOINT, identifier)

    async def download_many(self, identifiers: list[Identifier]) -> list[Asset]:
        return await self.client.endpoints.call(ASSET_DOWNLOAD_MANY_ENDPOINT, identifiers)

    def url(self, identifier: Identifier) -> str:
        address = self.client.network.address
        protocol = "https" if address.secure else "http"
        return f"{protocol}://{address.host}:{address.port}/asset?id={identifier.key()}"

    def proxy(self, url: str) -> str:
        address = self.client.network.address
        protocol = "https" if address.secure else "http"
        return f"{protocol}://{address.host}:{address.port}/proxy?url={url}"
