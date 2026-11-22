import {
    AUTHOR_TABLE_TYPE,
    CHANNEL_TABLE_TYPE,
    CHAT_PLUGIN_ID,
    CREATE_CHANNEL_TREE_ENDPOINT,
    MESSAGE_TABLE_TYPE,
    Models,
    PROVIDER_TABLE_TYPE,
    REACTION_SIGNAL,
    ROOM_TABLE_TYPE,
    VOTE_TABLE_TYPE,
} from '@omujs/chat';
import { Iwashi, type SiteProfile } from '@omujs/iwashi';
import { App, type Omu, VERSION } from '@omujs/omu';
import type { Table } from '@omujs/omu/api/table';

export class ProviderPattern {
    public static compile(regex: string): RegExp {
        return new RegExp(regex.replaceAll('(?P<', '(?<'));
    }
}

export class ChatHost {
    public static readonly APP: App = new App(CHAT_PLUGIN_ID, { type: 'plugin', version: VERSION });

    private readonly providers: Table<Models.Provider>;

    public constructor(
        omu: Omu,
        private readonly tree: (url: string) => Promise<SiteProfile[]> = ChatHost.crawl,
    ) {
        const messages = omu.tables.get(MESSAGE_TABLE_TYPE);
        messages.setConfig({ cache_size: 1000 });
        const authors = omu.tables.get(AUTHOR_TABLE_TYPE);
        authors.setConfig({ cache_size: 500 });
        omu.tables.get(CHANNEL_TABLE_TYPE);
        omu.tables.get(ROOM_TABLE_TYPE);
        omu.tables.get(VOTE_TABLE_TYPE);
        this.providers = omu.tables.get(PROVIDER_TABLE_TYPE);
        omu.signals.get(REACTION_SIGNAL);
        omu.endpoints.bind(CREATE_CHANNEL_TREE_ENDPOINT, (url) => this.createChannelTree(url));
    }

    public async createChannelTree(url: string): Promise<Models.Channel[]> {
        const profiles = await this.tree(url);
        const providers = [...(await this.providers.fetchAll()).values()];
        const channels = new Map<string, Models.Channel>();
        for (const profile of profiles) {
            for (const provider of providers) {
                if (!ProviderPattern.compile(provider.regex).test(profile.url)) continue;
                const id = provider.id.join(profile.id);
                channels.set(id.key(), new Models.Channel({
                    providerId: provider.id,
                    id,
                    name: profile.name || profile.id || profile.site,
                    description: profile.description ?? '',
                    iconUrl: profile.profilePicture ?? '',
                    url: profile.url,
                    active: true,
                }));
            }
        }
        return [...channels.values()];
    }

    private static async crawl(url: string): Promise<SiteProfile[]> {
        return (await Iwashi.tree(url))?.flatten() ?? [];
    }
}
