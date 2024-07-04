import { Identifier, Omu } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/extension/endpoint/endpoint.js';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { APP_ID } from './app.js';
import { get, type Writable } from 'svelte/store';
import { makeRegistryWritable } from '$lib/helper.js';

export const PLUGIN_ID = Identifier.fromKey('com.omuapps:marshmallow/plugin');
export type User = {
    name: string;
    screen_name: string;
    image: string;
};

export type Message = {
    message_id: string;
    content: string;
    liked: boolean;
    acknowledged: boolean;
    replied: boolean;
};

const REFRESH_USERS_ENDPOINT_TYPE = EndpointType.createJson<null, Record<string, User>>(PLUGIN_ID, {
    name: 'refresh_users',
});
const GET_MESSAGES_ENDPOINT_TYPE = EndpointType.createJson<string, Message[]>(PLUGIN_ID, {
    name: 'get_messages',
});
const SET_LIKED_ENDPOINT_TYPE = EndpointType.createJson<
    {
        user_id: string;
        message_id: string;
        liked: boolean;
    },
    Message
>(PLUGIN_ID, {
    name: 'set_liked',
});
const SET_ACKNOWLEDGED_ENDPOINT_TYPE = EndpointType.createJson<
    {
        user_id: string;
        message_id: string;
        acknowledged: boolean;
    },
    Message
>(PLUGIN_ID, {
    name: 'set_acknowledged',
});
const SET_REPLY_ENDPOINT_TYPE = EndpointType.createJson<
    {
        user_id: string;
        message_id: string;
        content: string;
    },
    Message
>(PLUGIN_ID, {
    name: 'set_reply',
});

export type MarshmallowConfig = {
    user: string | null;
    syncScroll: boolean;
};

const MARSHMALLOW_CONFIG_REGISTRY_TYPE = RegistryType.createJson<MarshmallowConfig>(APP_ID, {
    name: 'marshmallow_config',
    defaultValue: {
        user: null,
        syncScroll: true,
    },
});

export type MarshmallowData = {
    message: Message | null;
    scroll: number;
};

const MARSHMALLOW_DATA_REGISTRY_TYPE = RegistryType.createJson<MarshmallowData>(APP_ID, {
    name: 'marshmallow_data',
    defaultValue: {
        message: null,
        scroll: 0,
    },
});

export class MarshmallowApp {
    public readonly config: Writable<MarshmallowConfig>;
    public readonly data: Writable<MarshmallowData>;

    constructor(private readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(MARSHMALLOW_CONFIG_REGISTRY_TYPE));
        this.data = makeRegistryWritable(omu.registry.get(MARSHMALLOW_DATA_REGISTRY_TYPE));
    }

    async refreshUsers(): Promise<Record<string, User>> {
        return this.omu.endpoints.call(REFRESH_USERS_ENDPOINT_TYPE, null);
    }

    async getMessages(user: string): Promise<Message[]> {
        return this.omu.endpoints.call(GET_MESSAGES_ENDPOINT_TYPE, user);
    }

    async setLiked(message_id: string, liked: boolean): Promise<Message> {
        const user_id = get(this.config).user;
        return this.omu.endpoints.call(SET_LIKED_ENDPOINT_TYPE, { user_id, message_id, liked });
    }

    async setAcknowledged(message_id: string, acknowledged: boolean): Promise<Message> {
        const user_id = get(this.config).user;
        return this.omu.endpoints.call(SET_ACKNOWLEDGED_ENDPOINT_TYPE, {
            user_id,
            message_id,
            acknowledged,
        });
    }

    async setReply(message_id: string, content: string): Promise<Message> {
        const user_id = get(this.config).user;
        return this.omu.endpoints.call(SET_REPLY_ENDPOINT_TYPE, { user_id, message_id, content });
    }
}
