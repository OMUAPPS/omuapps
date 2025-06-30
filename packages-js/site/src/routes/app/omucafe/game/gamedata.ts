import { downloadFile } from '$lib/helper.js';
import { Identifier } from '@omujs/omu';
import { ByteReader, ByteWriter } from '@omujs/omu/bytebuffer.js';
import { getAssetBuffer, uploadAsset, type Asset } from '../asset/asset.js';
import { getGame, type GameConfig, type ResourceRegistry, type States } from '../omucafe-app.js';
import { getContext } from './game.js';

type GameDataJson = {
    version: number;
    resources: ResourceRegistry;
    gameConfig: GameConfig;
    states: States;
};

export class GameData {
    public static VERSION = 0;
    
    constructor(
        public readonly data: GameDataJson,
        public readonly buffers: Record<string, Uint8Array>,
        public readonly version: number = GameData.VERSION,
    ) {}

    public static async create() {
        const { gameConfigRegistry, resourcesRegistry, statesRegistry } = getGame();
        const gameConfig = await gameConfigRegistry.get();
        const resources = await resourcesRegistry.get();
        const states = await statesRegistry.get();
        const assets: Record<string, Asset> = {};
        const data: GameDataJson = {
            version: 0,
            resources: {
                assets: assets,
            },
            gameConfig,
            states: states,
        }
        const dataStr = JSON.stringify(data);
        const buffers: Record<string, Uint8Array> = {};
        for (const [key, value] of Object.entries(resources.assets)) {
            if (!dataStr.includes(key)) continue;
            assets[key] = value;
            const buffer = await getAssetBuffer(value);
            buffers[key] = buffer;
        }
        return new GameData(
            data,
            buffers,
            GameData.VERSION,
        );
    }

    public static async serialize(item: GameData): Promise<Uint8Array> {
        const writer = new ByteWriter();
        writer.writeULEB128(item.version);
        writer.writeString(JSON.stringify(item.data));
        writer.writeUint32(Object.keys(item.buffers).length);
        for (const [key, buffer] of Object.entries(item.buffers)) {
            writer.writeString(key);
            writer.writeUint8Array(buffer);
        }
        return writer.finish();
    }
    
    public static deserialize(buffer: Uint8Array): GameData {
        const reader = ByteReader.fromUint8Array(buffer);
        const version = reader.readULEB128();
        const dataStr = reader.readString();
        const data: GameDataJson = JSON.parse(dataStr);
        const assetCount = reader.readUint32();
        const buffers: Record<string, Uint8Array> = {};
        for (let i = 0; i < assetCount; i++) {
            const id = reader.readString();
            const buffer = reader.readUint8Array();
            buffers[id] = buffer;
        }
        return new GameData(
            data,
            buffers,
            version,
        )
    }

    public async download() {
        const content = await GameData.serialize(this);
        downloadFile({
            filename: 'omu-cafe-export.omucafe',
            content,
            type: 'application/octet-stream',
        });
    }

    public async load() {
        const { gameConfigRegistry, resourcesRegistry, statesRegistry } = getGame();
        const { data } = this;
        await Promise.all(Object.entries(this.buffers).map(async ([id, buffer]) => {
            const key = Identifier.fromKey(id);
            await uploadAsset(key, buffer);
        }));
        await gameConfigRegistry.set(data.gameConfig);
        await resourcesRegistry.set(data.resources);
        await statesRegistry.set(data.states);
        const kitchenContext = getContext();
        kitchenContext.items = data.states.kitchen.items;
    }
}
