import type { Omu } from '@omujs/omu';

import { SESSIONS_READ_PERMISSION_ID } from '@omujs/omu/api/session';
import { PLUGIN_ID } from './const.js';
import type { CreateBrowserRequest, CreateResponse, SceneCreateRequest, SceneCreateResponse, SceneJson, SceneListResponse, ScreenshotCreateRequest, ScreenshotCreateResponse, ScreenshotGetLastBinaryRequest, ScreenshotGetLastBinaryResponse, SourceGetByNameRequest, SourceGetByUuidRequest, SourceJson, SourceListRequest } from './types.js';
import {
    BROWSER_ADD,
    BROWSER_CREATE,
    SCENE_CREATE,
    SCENE_GET_BY_NAME,
    SCENE_GET_BY_UUID,
    SCENE_GET_CURRENT,
    SCENE_LIST,
    SCENE_SET_CURRENT_BY_NAME,
    SCENE_SET_CURRENT_BY_UUID,
    SCREENSHOT_CREATE,
    SCREENSHOT_GET_LAST_BINARY,
    SOURCE_ADD,
    SOURCE_CREATE,
    SOURCE_GET_BY_NAME,
    SOURCE_GET_BY_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE_BY_NAME,
    SOURCE_REMOVE_BY_UUID,
    SOURCE_UPDATE,
} from './types.js';
import { VERSION, VERSION_MINOR } from './version.js';
export * as OBSPermissions from './permissions.js';

type Events = {
    connected: () => void;
    disconnected: () => void;
};
type EventRecord<K extends keyof Events> = {
    [P in K]?: Array<Events[P]>;
};

export class OBSPlugin {
    private static INSTANCE: OBSPlugin | undefined;
    private connected = false;
    private readonly events: EventRecord<keyof Events> = {};

    private constructor(private readonly omu: Omu) {
        omu.plugins.require({
            omuplugin_obs: `>=${VERSION_MINOR}`,
        });
        omu.permissions.require(SESSIONS_READ_PERMISSION_ID);
        omu.sessions.observe(PLUGIN_ID, {
            onConnect: () => this.setConnected(true),
            onDisconnect: () => this.setConnected(false),
        });
        omu.onReady(async () => {
            this.setConnected(await omu.sessions.has(PLUGIN_ID));
        });
        OBSPlugin.INSTANCE = this;
    }

    public on<K extends keyof Events>(event: K, handler: Events[K]): () => void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]?.push(handler);
        return () => {
            const index = this.events[event]?.indexOf(handler);
            if (index !== undefined && index > -1) {
                this.events[event]?.splice(index, 1);
            }
        };
    }

    public static create(omu: Omu): OBSPlugin {
        if (omu.ready) {
            throw new Error('OMU instance is already started');
        }
        return new OBSPlugin(omu);
    }

    public get version(): string {
        return VERSION;
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private async setConnected(connected: boolean): Promise<void> {
        if (this.connected === connected) {
            return;
        }
        this.connected = connected;
        if (connected) {
            this.events.connected?.forEach((handler) => handler());
        } else {
            this.events.disconnected?.forEach((handler) => handler());
        }
    }

    public requirePlugin(): void {
        this.omu.sessions.require(PLUGIN_ID);
    }

    public assetConnected(): void {
        if (!this.isConnected()) {
            throw new Error('Not connected to OBS');
        }
    }

    async sourceCreate(source: SourceJson): Promise<CreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SOURCE_CREATE, source);
    }

    async sourceAdd(source: SourceJson): Promise<CreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SOURCE_ADD, source);
    }

    async browserCreate(options: CreateBrowserRequest): Promise<CreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(BROWSER_CREATE, options);
    }

    async browserAdd(options: CreateBrowserRequest): Promise<CreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(BROWSER_ADD, options);
    }

    async sourceUpdate(source: SourceJson): Promise<void> {
        this.assetConnected();
        await this.omu.endpoints.call(SOURCE_UPDATE, source);
    }

    async sourceRemoveByName(name: string): Promise<void> {
        this.assetConnected();
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_NAME, { name });
    }

    async sourceRemoveByUuid(uuid: string): Promise<void> {
        this.assetConnected();
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_UUID, { uuid });
    }

    async sourceGetByName(request: SourceGetByNameRequest): Promise<SourceJson> {
        this.assetConnected();
        return await this.omu.endpoints.call(SOURCE_GET_BY_NAME, request);
    }

    async sourceGetByUuid(request: SourceGetByUuidRequest): Promise<SourceJson> {
        this.assetConnected();
        return await this.omu.endpoints.call(SOURCE_GET_BY_UUID, request);
    }

    async sourceList(request: SourceListRequest): Promise<SourceJson[]> {
        this.assetConnected();
        return await this.omu.endpoints.call(SOURCE_LIST, request);
    }

    async sceneList(): Promise<SceneListResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCENE_LIST, {});
    }

    async sceneGetByName(name: string): Promise<SceneJson> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCENE_GET_BY_NAME, { name });
    }

    async sceneGetByUuid(uuid: string): Promise<SceneJson> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCENE_GET_BY_UUID, { uuid });
    }

    async sceneGetCurrent(): Promise<SceneJson | null> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCENE_GET_CURRENT, {});
    }

    async sceneSetCurrentByName(name: string): Promise<void> {
        this.assetConnected();
        await this.omu.endpoints.call(SCENE_SET_CURRENT_BY_NAME, { name });
    }

    async sceneSetCurrentByUuid(uuid: string): Promise<void> {
        this.assetConnected();
        await this.omu.endpoints.call(SCENE_SET_CURRENT_BY_UUID, { uuid });
    }

    async sceneCreate(request: SceneCreateRequest): Promise<SceneCreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCENE_CREATE, request);
    }

    async screenshotCreate(request: ScreenshotCreateRequest): Promise<ScreenshotCreateResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCREENSHOT_CREATE, request);
    }

    async screenshotGetLastBinary(request: ScreenshotGetLastBinaryRequest): Promise<ScreenshotGetLastBinaryResponse> {
        this.assetConnected();
        return await this.omu.endpoints.call(SCREENSHOT_GET_LAST_BINARY, request);
    }
}
