import { Identifier, IntoId } from '../../identifier';
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

export const ASSET_PERMISSION_ID: Identifier = ASSET_EXTENSION_TYPE.join('permission');

const ASSET_UPLOAD_ENDPOINT = EndpointType.createSerialized<Asset, Identifier>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'upload',
        requestSerializer: FILE_SERIALIZER,
        responseSerializer: Serializer.of(Identifier).toJson(),
        permissionId: ASSET_PERMISSION_ID,
    },
);
const ASSET_UPLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Asset[], Identifier[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'upload_many',
        requestSerializer: FILE_ARRAY_SERIALIZER,
        responseSerializer: Serializer.of(Identifier).toArray().pipe(Serializer.json()),
        permissionId: ASSET_PERMISSION_ID,
    },
);
const ASSET_DOWNLOAD_ENDPOINT = EndpointType.createSerialized<Identifier, Asset>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download',
        requestSerializer: Serializer.of(Identifier).pipe(Serializer.json()),
        responseSerializer: FILE_SERIALIZER,
        permissionId: ASSET_PERMISSION_ID,
    },
);
const ASSET_DOWNLOAD_MANY_ENDPOINT = EndpointType.createSerialized<Identifier[], Asset[]>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'download_many',
        requestSerializer: Serializer.of(Identifier).toArray().pipe(Serializer.json()),
        responseSerializer: FILE_ARRAY_SERIALIZER,
        permissionId: ASSET_PERMISSION_ID,
    },
);
const ASSET_DELETE_ENDPOINT = EndpointType.createJson<Identifier, null>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'delete',
        requestSerializer: Identifier,
        permissionId: ASSET_PERMISSION_ID,
    },
);

const ASSET_GENERATE_TOKEN_ENDPOINT = EndpointType.createJson<object, { token: string }>(
    ASSET_EXTENSION_TYPE,
    {
        name: 'token_generate',
        permissionId: ASSET_PERMISSION_ID,
    },
);

export class AssetExtension {
    public readonly type: ExtensionType<AssetExtension> = ASSET_EXTENSION_TYPE;
    private assetToken: string | undefined = undefined;

    constructor(private readonly omu: Omu) {
        omu.network.event.disconnected.listen(() => {
            this.assetToken = undefined;
        });
        omu.onReady(async () => {
            if (omu.permissions.required(ASSET_PERMISSION_ID)) {
                await this.requestGenerateAssetToken();
            }
        });
    }

    public async upload(identifier: IntoId, buffer: Uint8Array): Promise<Identifier> {
        const assetIdentifier = await this.omu.endpoints.call(ASSET_UPLOAD_ENDPOINT, {
            identifier: Identifier.from(identifier),
            buffer,
        });
        return assetIdentifier;
    }

    public async uploadMany(...files: Asset[]): Promise<Identifier[]> {
        const uploaded = await this.omu.endpoints.call(ASSET_UPLOAD_MANY_ENDPOINT, files);
        return uploaded;
    }

    public async download(identifier: IntoId): Promise<Asset> {
        const id = Identifier.from(identifier);
        const downloaded = await this.omu.endpoints.call(ASSET_DOWNLOAD_ENDPOINT, id);
        return downloaded;
    }

    public async downloadMany(...identifiers: IntoId[]): Promise<Asset[]> {
        const downloaded = await this.omu.endpoints.call(
            ASSET_DOWNLOAD_MANY_ENDPOINT,
            identifiers.map((id) => Identifier.from(id)),
        );
        return downloaded;
    }

    public async delete(identifier: IntoId): Promise<void> {
        const id = Identifier.from(identifier);
        await this.omu.endpoints.call(ASSET_DELETE_ENDPOINT, id);
    }

    private async requestGenerateAssetToken() {
        const result = await this.omu.endpoints.call(ASSET_GENERATE_TOKEN_ENDPOINT, {});
        this.assetToken = result.token;
    }

    public url(
        id: IntoId,
        options?: { cache?: 'no-cache' },
    ): string {
        if (!this.assetToken) {
            throw new Error('Asset token is not set');
        }
        const key = Identifier.from(id).key();
        const address = this.omu.network.address;
        const protocol = address.secure ? 'https' : 'http';
        const url = new URL(`${protocol}://${address.host}:${address.port}/asset`);
        url.searchParams.set('asset_token', this.assetToken);
        url.searchParams.set('id', key);
        if (options?.cache === 'no-cache') {
            url.searchParams.set('t', Date.now().toString());
        }
        return url.toString();
    }

    public proxy(url: string): string {
        if (!this.assetToken) {
            throw new Error('Asset token is not set');
        }
        const address = this.omu.network.address;
        const protocol = address.secure ? 'https' : 'http';
        const proxyUrl = new URL(`${protocol}://${address.host}:${address.port}/proxy`);
        proxyUrl.searchParams.set('asset_token', this.assetToken);
        proxyUrl.searchParams.set('url', url);
        return proxyUrl.toString();
    }
}
