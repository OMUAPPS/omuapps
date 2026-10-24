import { HttpClient } from '@omujs/iwashi';

import type { ProviderHttp } from '../provider';

export type StreamMetadata = {
    channel: { id: string };
    lastBroadcast: { id: string; title?: string | null } | null;
    stream: { createdAt: string; game?: { name: string } | null } | null;
};

export type ViewerCard = {
    channelViewer: { earnedBadges?: { setID: string; title: string; image4x: string }[] | null };
    targetUser: { displayName: string; profileImageURL: string };
};

export type AboutPanel = {
    user?: { videos?: { edges?: { node?: { id?: string } }[] } } | null;
};

export class TwitchApi {
    private static readonly CLIENT_ID = /clientId="(?<clientId>\w+)"/;
    private static readonly HASHES: Record<string, string> = {
        StreamMetadata: 'b57f9b910f8cd1a4659d894fe7550ccc81ec9052c01e438b290fd66a040b9b93',
        ViewerCard: 'd46031bdcc9880edd0a8b57dfebe13ce27493f4da64fad744ba6a81560900a52',
        ChannelRoot_AboutPanel: '0df42c4d26990ec1216d0b815c92cc4a4a806e25b352b66ac1dd91d5a1d59b80',
    };
    private static readonly PLAYBACK_QUERY = 'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!, $platform: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature   authorization { isForbidden forbiddenReasonCode }   __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature   __typename  }}';

    private constructor(
        private readonly http: ProviderHttp,
        private readonly clientId: string,
    ) {}

    public static async create(http: ProviderHttp): Promise<TwitchApi> {
        const page = HttpClient.parse(await http.text('https://twitch.tv'));
        for (const script of page.querySelectorAll('script')) {
            const clientId = TwitchApi.CLIENT_ID.exec(script.text)?.groups?.clientId;
            if (clientId) return new TwitchApi(http, clientId);
        }
        throw new Error('Client ID not found');
    }

    public async streamMetadata(login: string): Promise<StreamMetadata | undefined> {
        const data = await this.gql<{ user?: StreamMetadata | null }>('StreamMetadata', { channelLogin: login, includeIsDJ: true });
        return data.user ?? undefined;
    }

    public viewerCard(channelLogin: string, recipientLogin: string): Promise<ViewerCard> {
        return this.gql<ViewerCard>('ViewerCard', {
            channelLogin,
            hasChannelID: false,
            giftRecipientLogin: recipientLogin,
            isViewerBadgeCollectionEnabled: false,
            withStandardGifting: true,
            badgeSourceChannelLogin: channelLogin,
        });
    }

    public aboutPanel(channelLogin: string): Promise<AboutPanel> {
        return this.gql<AboutPanel>('ChannelRoot_AboutPanel', { channelLogin, includeIsDJ: true, skipSchedule: false });
    }

    public async channelId(login: string): Promise<number> {
        const data = await this.gql<{ streamPlaybackAccessToken: { value: string } }>('PlaybackAccessToken_Template', {
            isLive: true,
            isVod: false,
            login,
            vodID: '',
            platform: 'web',
            playerType: 'site',
        }, TwitchApi.PLAYBACK_QUERY);
        const value: { channel_id: number } = JSON.parse(data.streamPlaybackAccessToken.value);
        return value.channel_id;
    }

    private async gql<T>(operationName: string, variables: object, query?: string): Promise<T> {
        const hash = TwitchApi.HASHES[operationName];
        const payload = {
            operationName,
            variables,
            ...(hash ? { extensions: { persistedQuery: { version: 1, sha256Hash: hash } } } : {}),
            ...(query ? { query } : {}),
        };
        const response = await this.http.json<{ data: T; errors?: unknown }>('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: { 'Client-Id': this.clientId, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (response.errors) throw new Error(`Twitch GQL ${operationName} failed: ${JSON.stringify(response.errors)}`);
        return response.data;
    }
}
