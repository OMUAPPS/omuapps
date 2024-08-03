import { makeRegistryWritable } from '$lib/helper.js';
import { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import {
    SCENE_LIST,
    SOURCE_CREATE,
    SOURCE_GET_BY_NAME,
    SOURCE_GET_BY_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE_BY_NAME,
    SOURCE_REMOVE_BY_UUID,
    SOURCE_UPDATE,
    type CreateResponse,
    type SceneListRequest,
    type SceneListResponse,
    type SourceJson,
} from './types.js';

export type OBSSyncConfig = {
    version: number;
};

const BREAK_TIMER_CONFIG_REGISTRY_TYPE = RegistryType.createJson<OBSSyncConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        version: 1,
    },
});

export class OBSSyncApp {
    public readonly config: Writable<OBSSyncConfig>;

    constructor(public readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(BREAK_TIMER_CONFIG_REGISTRY_TYPE));
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
        return await this.omu.endpoints.call(SCENE_LIST, { name });
    }
}
