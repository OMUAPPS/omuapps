import type { Omu } from '@omujs/omu';

import { PLUGIN_ID } from './const.js';
import type { CreateResponse, SceneListRequest, SceneListResponse, SourceJson } from './types.js';
import {
    SCENE_GET,
    SCENE_LIST,
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
        omu.server.require(PLUGIN_ID);
    }

    public get version(): string {
        return VERSION;
    }

    public static create(omu: Omu): OBSPlugin {
        if (omu.ready) {
            throw new Error('OMU instance is already started');
        }
        return new OBSPlugin(omu);
    }

    async sourceCreate(source: SourceJson): Promise<CreateResponse> {
        return await this.omu.endpoints.call(SOURCE_CREATE, source);
    }

    async sourceUpdate(source: SourceJson): Promise<void> {
        await this.omu.endpoints.call(SOURCE_UPDATE, source);
    }

    async sourceRemoveByName(name: string): Promise<void> {
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_NAME, { name });
    }

    async sourceRemoveByUuid(uuid: string): Promise<void> {
        await this.omu.endpoints.call(SOURCE_REMOVE_BY_UUID, { uuid });
    }

    async sourceGetByName(name: string): Promise<SourceJson> {
        return await this.omu.endpoints.call(SOURCE_GET_BY_NAME, { name });
    }

    async sourceGetByUuid(uuid: string): Promise<SourceJson> {
        return await this.omu.endpoints.call(SOURCE_GET_BY_UUID, { uuid });
    }

    async sourceList(): Promise<SourceJson[]> {
        return await this.omu.endpoints.call(SOURCE_LIST, {});
    }

    async sceneList(): Promise<SceneListResponse> {
        return await this.omu.endpoints.call(SCENE_LIST, {});
    }

    async sceneGet(name: string): Promise<SceneListRequest> {
        return await this.omu.endpoints.call(SCENE_GET, { scene: name });
    }
}
