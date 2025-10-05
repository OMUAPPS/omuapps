import { Identifier } from '../../identifier';
import { Omu } from '../../omu';
import { ByteReader, ByteWriter, Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';

export const ASSET_EXTENSION_TYPE: ExtensionType<AssetExtension> = new ExtensionType(
    'asset',
    (omu: Omu) => new AssetExtension(omu),
);

export type Asset = {
    identifier: Identifier;
    buffer: Uint8Array;
};

const FILE_SERIALIZER = new Serializer<Asset, Uint8Array>(
    (file) => {
        const writer = new ByteWriter();
        writer.writeString(file.identifier.key());
        writer.writeUint8Array(file.buffer);
        return writer.finish();
    },
    (data) => {
        const reader = ByteReader.fromUint8Array(data);
        const identifier = Identifier.fromKey(reader.readString());
        const buffer = reader.readUint8Array();
        reader.finish();
        return { identifier, buffer };
    },
);
const FILE_ARRAY_SERIALIZER = new Serializer<Asset[], Uint8Array>(
    (files) => {
        const writer = new ByteWriter();
        writer.writeULEB128(files.length);
        for (const file of files) {
            writer.writeString(file.identifier.key());
            writer.writeUint8Array(file.buffer);
        }
        return writer.finish();
    },
    (data) => {
        const reader = ByteReader.fromUint8Array(data);
        const length = reader.readULEB128();
        const files: Asset[] = [];
        for (let i = 0; i < length; i++) {
            const identifier = Identifier.fromKey(reader.readString());
            const buffer = reader.readUint8Array();
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
        responseSerializer: Serializer.of(Identifier).toJson(),
        permissionId: ASSET_UPLOAD_PERMISSION_ID,
    },
);
const ASSET_UPLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Asset[], Identifier[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'upload_many',
        requestSerializer: FILE_ARRAY_SERIALIZER,
        responseSerializer: Serializer.of(Identifier).toArray().pipe(Serializer.json()),
        permissionId: ASSET_UPLOAD_PERMISSION_ID,
    },
);
export const ASSET_DOWNLOAD_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('download');
const ASSET_DOWNLOAD_ENDPOINT = EndpointType.createSerialized<Identifier, Asset>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download',
        requestSerializer: Serializer.of(Identifier).pipe(Serializer.json()),
        responseSerializer: FILE_SERIALIZER,
        permissionId: ASSET_DOWNLOAD_PERMISSION_ID,
    },
);
const ASSET_DOWNLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Identifier[], Asset[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download_many',
        requestSerializer: Serializer.of(Identifier).toArray().pipe(Serializer.json()),
        responseSerializer: FILE_ARRAY_SERIALIZER,
        permissionId: ASSET_DOWNLOAD_PERMISSION_ID,
    },
);
export const ASSET_DELETE_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('delete');
const ASSET_DELETE_ENDPOINT = EndpointType.createJson<Identifier, null>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'delete',
        requestSerializer: Identifier,
        permissionId: ASSET_DELETE_PERMISSION_ID,
    },
);

export class AssetExtension {
    public readonly type: ExtensionType<AssetExtension> = ASSET_EXTENSION_TYPE;

    constructor(private readonly omu: Omu) {}

    public async upload(identifier: Identifier, buffer: Uint8Array): Promise<Identifier> {
        const assetIdentifier = await this.omu.endpoints.call(ASSET_UPLOAD_ENDPOINT, {
            identifier,
            buffer,
        });
        return assetIdentifier;
    }

    public async uploadMany(...files: Asset[]): Promise<Identifier[]> {
        const uploaded = await this.omu.endpoints.call(ASSET_UPLOAD_MANY_ENDPOINT, files);
        return uploaded;
    }

    public async download(identifier: Identifier | string): Promise<Asset> {
        const id = typeof identifier === 'string' ? Identifier.fromKey(identifier) : identifier;
        const downloaded = await this.omu.endpoints.call(ASSET_DOWNLOAD_ENDPOINT, id);
        return downloaded;
    }

    public async downloadMany(...identifiers: Identifier[]): Promise<Asset[]> {
        const downloaded = await this.omu.endpoints.call(
            ASSET_DOWNLOAD_MANY_ENDPOINT,
            identifiers,
        );
        return downloaded;
    }

    public async delete(identifier: Identifier | string): Promise<void> {
        const id = typeof identifier === 'string' ? Identifier.fromKey(identifier) : identifier;
        await this.omu.endpoints.call(ASSET_DELETE_ENDPOINT, id);
    }

    public url(
        id: Identifier | string,
        options?: { cache?: 'no-cache' },
    ): string {
        const key = typeof id === 'string' ? id : id.key();
        const address = this.omu.network.address;
        const protocol = address.secure ? 'https' : 'http';
        if (options?.cache === 'no-cache') {
            return `${protocol}://${address.host}:${address.port}/asset?id=${encodeURIComponent(key)}&t=${Date.now()}`;
        }
        return `${protocol}://${address.host}:${address.port}/asset?id=${encodeURIComponent(key)}`;
    }

    public proxy(url: string): string {
        const address = this.omu.network.address;
        const protocol = address.secure ? 'https' : 'http';
        return `${protocol}://${address.host}:${address.port}/proxy?url=${encodeURIComponent(url)}`;
    }
}
