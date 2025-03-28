import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import type { Client } from '../../client.js';
import { Identifier } from '../../identifier.js';
import { Serializer } from '../../serializer.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';

export const ASSET_EXTENSION_TYPE: ExtensionType<AssetExtension> = new ExtensionType(
    'asset',
    (client: Client) => new AssetExtension(client),
);

type Asset = {
    identifier: Identifier;
    buffer: Uint8Array;
};

const FILE_SERIALIZER = new Serializer<Asset, Uint8Array>(
    (file) => {
        const writer = new ByteWriter();
        writer.writeString(file.identifier.key());
        writer.writeByteArray(file.buffer);
        return writer.finish();
    },
    (data) => {
        const reader = ByteReader.fromUint8Array(data);
        const identifier = Identifier.fromKey(reader.readString());
        const buffer = reader.readByteArray();
        reader.finish();
        return { identifier, buffer };
    },
);
const FILE_ARRAY_SERIALIZER = new Serializer<Asset[], Uint8Array>(
    (files) => {
        const writer = new ByteWriter();
        writer.writeInt(files.length);
        for (const file of files) {
            writer.writeString(file.identifier.key());
            writer.writeByteArray(file.buffer);
        }
        return writer.finish();
    },
    (data) => {
        const reader = ByteReader.fromUint8Array(data);
        const count = reader.readInt();
        const files: Asset[] = [];
        for (let i = 0; i < count; i++) {
            const identifier = Identifier.fromKey(reader.readString());
            const buffer = reader.readByteArray();
            files.push({ identifier, buffer });
        }
        reader.finish();
        return files;
    },
);

export const ASSET_UPLOAD_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('upload');
const ASSET_UPLOAD_ENDPOINT = EndpointType.createSerialized<Asset, Identifier>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'upload',
        requestSerializer: FILE_SERIALIZER,
        responseSerializer: Serializer.model(Identifier).pipe(Serializer.json()),
        permissionId: ASSET_UPLOAD_PERMISSION_ID,
    },
);
const ASSET_UPLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Asset[], Identifier[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'upload_many',
        requestSerializer: FILE_ARRAY_SERIALIZER,
        responseSerializer: Serializer.model(Identifier).toArray().pipe(Serializer.json()),
        permissionId: ASSET_UPLOAD_PERMISSION_ID,
    },
);
export const ASSET_DOWNLOAD_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('download');
const ASSET_DOWNLOAD_ENDPOINT = EndpointType.createSerialized<Identifier, Asset>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download',
        requestSerializer: Serializer.model(Identifier).pipe(Serializer.json()),
        responseSerializer: FILE_SERIALIZER,
        permissionId: ASSET_DOWNLOAD_PERMISSION_ID,
    },
);
const ASSET_DOWNLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Identifier[], Asset[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download_many',
        requestSerializer: Serializer.model(Identifier).toArray().pipe(Serializer.json()),
        responseSerializer: FILE_ARRAY_SERIALIZER,
        permissionId: ASSET_DOWNLOAD_PERMISSION_ID,
    },
);
export const ASSET_DELETE_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('delete');
const ASSET_DELETE_ENDPOINT = EndpointType.createSerialized<Identifier, void>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'delete',
        requestSerializer: Serializer.model(Identifier).pipe(Serializer.json()),
        responseSerializer: Serializer.json(),
        permissionId: ASSET_DELETE_PERMISSION_ID,
    },
);

export class AssetExtension {
    public readonly type: ExtensionType<AssetExtension> = ASSET_EXTENSION_TYPE;

    constructor(private readonly client: Client) {}

    public async upload(identifier: Identifier, buffer: Uint8Array): Promise<Identifier> {
        const assetIdentifier = await this.client.endpoints.call(ASSET_UPLOAD_ENDPOINT, {
            identifier,
            buffer,
        });
        return assetIdentifier;
    }

    public async uploadMany(...files: Asset[]): Promise<Identifier[]> {
        const uploaded = await this.client.endpoints.call(ASSET_UPLOAD_MANY_ENDPOINT, files);
        return uploaded;
    }

    public async download(identifier: Identifier | string): Promise<Asset> {
        const id = typeof identifier === 'string' ? Identifier.fromKey(identifier) : identifier;
        const downloaded = await this.client.endpoints.call(ASSET_DOWNLOAD_ENDPOINT, id);
        return downloaded;
    }

    public async downloadMany(...identifiers: Identifier[]): Promise<Asset[]> {
        const downloaded = await this.client.endpoints.call(
            ASSET_DOWNLOAD_MANY_ENDPOINT,
            identifiers,
        );
        return downloaded;
    }

    public async delete(identifier: Identifier | string): Promise<void> {
        const id = typeof identifier === 'string' ? Identifier.fromKey(identifier) : identifier;
        await this.client.endpoints.call(ASSET_DELETE_ENDPOINT, id);
    }

    public url(
        id: Identifier | string,
        options?: { cache?: 'no-cache'; },
    ): string {
        const key = typeof id === 'string' ? id : id.key();
        const address = this.client.network.address;
        const protocol = address.secure ? 'https' : 'http';
        if (options?.cache === 'no-cache') {
            return `${protocol}://${address.host}:${address.port}/asset?id=${encodeURIComponent(key)}&t=${Date.now()}`;
        }
        return `${protocol}://${address.host}:${address.port}/asset?id=${encodeURIComponent(key)}`;
    }

    public proxy(url: string): string {
        const address = this.client.network.address;
        const protocol = address.secure ? 'https' : 'http';
        return `${protocol}://${address.host}:${address.port}/proxy?url=${encodeURIComponent(url)}`;
    }
}
