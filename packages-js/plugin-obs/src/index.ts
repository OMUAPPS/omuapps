import type { Omu } from '@omujs/omu';

import { SERVER_SESSIONS_READ_PERMISSION_ID } from '@omujs/omu/extension/server/server-extension.js';
import { PLUGIN_ID } from './const.js';
import type { CreateResponse, SceneJson, SceneListResponse, SourceJson } from './types.js';
import {
    SCENE_GET_BY_NAME,
    SCENE_GET_BY_UUID,
    SCENE_GET_CURRENT,
    SCENE_LIST,
    SCENE_SET_CURRENT_BY_NAME,
    SCENE_SET_CURRENT_BY_UUID,
    SOURCE_CREATE,
    SOURCE_GET_BY_NAME,
    SOURCE_GET_BY_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE_BY_NAME,
    SOURCE_REMOVE_BY_UUID,
    SOURCE_UPDATE,
} from './types.js';
import { VERSION } from './version.js';
export * as permissions from './permissions.js';

type Events = {
    connected: () => void;
    disconnected: () => void;
};
type EventRecord<K extends keyof Events> = {
    [P in K]?: Array<Events[P]>;
};
export class OBSPlugin {
    private connected = false;
    private readonly events: EventRecord<keyof Events> = {};
    
    private constructor(private readonly omu: Omu) {
        omu.plugins.require({
            omuplugin_obs: `==${VERSION}`,
        });
        omu.permissions.require(SERVER_SESSIONS_READ_PERMISSION_ID);
        omu.server.observeSessions(PLUGIN_ID, {
            onConnect: () => this.setConnected(true),
            onDisconnect: () => this.setConnected(false),
        });
        omu.onReady(async () => {
            this.setConnected(await omu.server.sessions.has(PLUGIN_ID.key()));
        });
    }

    public on<K extends keyof Events>(event: K, handler: Events[K]): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]?.push(handler);
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

    public async isConnected(): Promise<boolean> {
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
        this.omu.server.require(PLUGIN_ID);
    }

    async sourceCreate(source: SourceJson): Promise<CreateResponse> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SOURCE_CREATE, source);
    }

    async sourceUpdate(source: SourceJson): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SOURCE_UPDATE, source);
    }

    async sourceRemoveByName(name: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_NAME, { name });
    }

    async sourceRemoveByUuid(uuid: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_UUID, { uuid });
    }

    async sourceGetByName(name: string): Promise<SourceJson> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SOURCE_GET_BY_NAME, { name });
    }

    async sourceGetByUuid(uuid: string): Promise<SourceJson> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SOURCE_GET_BY_UUID, { uuid });
    }

    async sourceList(): Promise<SourceJson[]> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SOURCE_LIST, {});
    }

    async sceneList(): Promise<SceneListResponse> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SCENE_LIST, {});
    }

    async sceneGetByName(name: string): Promise<SceneJson> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SCENE_GET_BY_NAME, { name });
    }

    async sceneGetByUuid(uuid: string): Promise<SceneJson> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SCENE_GET_BY_UUID, { uuid });
    }

    async sceneGetCurrent(): Promise<SceneJson | null> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SCENE_GET_CURRENT, {});
    }

    async sceneSetCurrentByName(name: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SCENE_SET_CURRENT_BY_NAME, { name });
    }

    async sceneSetCurrentByUuid(uuid: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SCENE_SET_CURRENT_BY_UUID, { uuid });
    }
}
