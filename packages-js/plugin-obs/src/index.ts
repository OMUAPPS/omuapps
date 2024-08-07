import type { Omu } from '@omujs/omu';

import { PLUGIN_ID } from './const.js';
import type { CreateResponse, SceneJson, SceneListResponse, SourceJson } from './types.js';
import {
    SCENE_GET,
    SCENE_LIST,
    SCENE_SET_BY_NAME,
    SCENE_SET_BY_UUID,
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

export class OBSPlugin {
    constructor(private readonly omu: Omu) {
        omu.plugins.require({
            omuplugin_obs: `==${VERSION}`,
        });
    }

    public get version(): string {
        return VERSION;
    }

    public async isConnected(): Promise<boolean> {
        return (await this.omu.server.sessions.get(PLUGIN_ID.key())) !== undefined;
    }

    public requirePlugin(): void {
        this.omu.server.require(PLUGIN_ID);
    }

    public static create(omu: Omu): OBSPlugin {
        if (omu.ready) {
            throw new Error('OMU instance is already started');
        }
        return new OBSPlugin(omu);
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

    async sceneGet(name: string): Promise<SceneJson> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        return await this.omu.endpoints.call(SCENE_GET, { scene: name });
    }

    async sceneSetByName(name: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SCENE_SET_BY_NAME, { name });
    }

    async sceneSetByUuid(uuid: string): Promise<void> {
        if (!(await this.isConnected())) {
            throw new Error('Not connected to OBS');
        }
        await this.omu.endpoints.call(SCENE_SET_BY_UUID, { uuid });
    }
}
