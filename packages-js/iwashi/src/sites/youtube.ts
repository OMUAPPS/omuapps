import type { HTMLElement } from 'node-html-parser';

import { type HttpClient, PatternVisitor, ProfileUrl, type SiteProfile } from '../crawl';

type Thumbnail = { url: string; width?: number };

type ChannelMetadata = {
    title: string;
    description: string;
    channelUrl: string;
    vanityChannelUrl: string;
    avatar: { thumbnails: Thumbnail[] };
};

type InitialData = {
    metadata: { channelMetadataRenderer: ChannelMetadata };
    header?: Record<string, unknown>;
};

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

class JsonPath {
    public constructor(private readonly value: Json) {}

    public get(...keys: (string | number)[]): JsonPath {
        let value: Json = this.value;
        for (const key of keys) {
            if (value === null || typeof value !== 'object') return new JsonPath(undefined);
            value = (value as Record<string | number, Json>)[key];
        }
        return new JsonPath(value);
    }

    public list(): JsonPath[] {
        return Array.isArray(this.value) ? this.value.map((item) => new JsonPath(item as Json)) : [];
    }

    public string(): string | undefined {
        return typeof this.value === 'string' ? this.value : undefined;
    }

    public has(): boolean {
        return this.value !== undefined && this.value !== null;
    }
}

export class YoutubeVisitor extends PatternVisitor {
    private static readonly VANITY_ID = /youtube\.com\/@(?<id>[^/]+)/;
    private static readonly CHANNEL_ID = /youtube\.com\/channel\/(?<id>[^/]+)/;
    private static readonly INITIAL_DATA = /ytInitialData\s*=\s*(\{.+\});/;
    private static readonly ENGAGEMENT_PATH = [
        'onTap', 'innertubeCommand', 'showEngagementPanelEndpoint', 'engagementPanel',
        'engagementPanelSectionListRenderer', 'content', 'sectionListRenderer', 'contents',
    ];

    public constructor() {
        super('Youtube', String.raw`((m|gaming)\.)?(youtube\.com|youtu\.be)`, '');
    }

    public async resolveId(url: string, http: HttpClient): Promise<string | undefined> {
        const normalized = ProfileUrl.normalize(url);
        if (!normalized) return;
        const uri = new URL(normalized);
        if (uri.hostname === 'youtu.be') return this.channelByOembed(http, uri.pathname.slice(1));
        const parts = uri.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return;
        const [type] = parts;
        if (type.startsWith('@')) return this.idFromVanityUrl(http, url);
        if (type === 'playlist') return;
        if (type === 'watch') {
            const video = uri.searchParams.get('v');
            return video ? this.channelByOembed(http, video) : undefined;
        }
        if (type === 'live' || type === 'shorts') return this.channelByOembed(http, parts.at(-1) ?? '');
        if (type === 'channel' || type === 'user' || type === 'c') return this.channelByUrl(http, url);
        if (parts.length > 1) return this.idFromVanityUrl(http, `https://youtube.com/@${parts[1]}`);
        return;
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const data = await this.initialData(http, `https://www.youtube.com/channel/${id}`);
        const metadata = data.metadata.channelMetadataRenderer;
        const channelId = await this.idFromVanityUrl(http, metadata.vanityChannelUrl);
        const token = this.aboutToken(new JsonPath(data as unknown as Json));
        return {
            site: this.name,
            id,
            uniqueId: id,
            screenId: YoutubeVisitor.vanityId(metadata.vanityChannelUrl),
            url: `https://www.youtube.com/channel/${channelId}`,
            name: metadata.title,
            description: metadata.description,
            profilePicture: YoutubeVisitor.largestThumbnail(metadata.avatar.thumbnails),
            links: token ? await this.aboutLinks(http, token) : [],
        };
    }

    private async channelByOembed(http: HttpClient, videoId: string): Promise<string | undefined> {
        const response = await http.request('https://www.youtube.com/oembed', {
            params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
        });
        if (!response.ok) return;
        const { author_url: authorUrl } = await response.json() as { author_url?: string };
        if (!authorUrl) return;
        return this.idFromVanityUrl(http, authorUrl);
    }

    private async channelByUrl(http: HttpClient, url: string): Promise<string | undefined> {
        const data = await this.initialData(http, url);
        return YoutubeVisitor.channelId(data.metadata.channelMetadataRenderer.channelUrl);
    }

    private async idFromVanityUrl(http: HttpClient, url: string): Promise<string | undefined> {
        const vanity = YoutubeVisitor.vanityId(url);
        if (!vanity) return;
        const data = await this.initialData(http, `https://www.youtube.com/@${vanity}`);
        return YoutubeVisitor.channelId(data.metadata.channelMetadataRenderer.channelUrl);
    }

    private async initialData(http: HttpClient, url: string): Promise<InitialData> {
        return YoutubeVisitor.extractInitialData(await http.html(url));
    }

    private aboutToken(data: JsonPath): string | undefined {
        const header = data.get('header');
        if (header.get('pageHeaderRenderer').has()) {
            const viewModel = header.get('pageHeaderRenderer', 'content', 'pageHeaderViewModel');
            const description = viewModel.get('description', 'descriptionPreviewViewModel', 'rendererContext', 'commandContext', ...YoutubeVisitor.ENGAGEMENT_PATH);
            return YoutubeVisitor.tokenFrom(description)
                ?? YoutubeVisitor.tokenFromRuns(viewModel.get('attribution', 'attributionViewModel', 'suffix', 'commandRuns'));
        }
        if (header.get('c4TabbedHeaderRenderer').has()) {
            return YoutubeVisitor.tokenFromRuns(header.get('c4TabbedHeaderRenderer', 'headerLinks', 'channelHeaderLinksViewModel', 'more', 'commandRuns'));
        }
        return;
    }

    private async aboutLinks(http: HttpClient, token: string): Promise<string[]> {
        const about = new JsonPath(await http.json<Json>('https://www.youtube.com/youtubei/v1/browse', {
            json: {
                context: {
                    client: {
                        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36,gzip(gfe)',
                        clientName: 'WEB',
                        clientVersion: '2.20240509.00.00',
                    },
                },
                continuation: token,
            },
        }));
        const links: string[] = [];
        for (const endpoint of about.get('onResponseReceivedEndpoints').list()) {
            for (const item of endpoint.get('appendContinuationItemsAction', 'continuationItems').list()) {
                for (const link of item.get('aboutChannelRenderer', 'metadata', 'aboutChannelViewModel', 'links').list()) {
                    for (const run of link.get('channelExternalLinkViewModel', 'link', 'commandRuns').list()) {
                        const url = run.get('onTap', 'innertubeCommand', 'urlEndpoint', 'url').string();
                        if (url) links.push(YoutubeVisitor.parseRedirect(url));
                    }
                }
            }
        }
        return links;
    }

    public static extractInitialData(page: HTMLElement): InitialData {
        for (const script of page.querySelectorAll('script')) {
            const match = YoutubeVisitor.INITIAL_DATA.exec(script.text);
            if (match) return JSON.parse(match[1]);
        }
        throw new Error('ytInitialData not found');
    }

    private static tokenFromRuns(runs: JsonPath): string | undefined {
        for (const run of runs.list()) {
            const token = YoutubeVisitor.tokenFrom(run.get(...YoutubeVisitor.ENGAGEMENT_PATH));
            if (token) return token;
        }
        return;
    }

    private static tokenFrom(contents: JsonPath): string | undefined {
        for (const item of contents.list()) {
            for (const section of item.get('itemSectionRenderer', 'contents').list()) {
                const endpoint = section.get('continuationItemRenderer', 'continuationEndpoint');
                const token = endpoint.get('continuationCommand', 'token').string();
                if (token) return token;
                const apiUrl = endpoint.get('commandMetadata', 'webCommandMetadata', 'apiUrl').string();
                if (apiUrl?.startsWith('/youtubei/v1/browse')) return endpoint.get('continuationCommand', 'token').string();
            }
        }
        return;
    }

    private static parseRedirect(url: string): string {
        const uri = new URL(url);
        if (uri.hostname !== 'www.youtube.com' || uri.pathname !== '/redirect') return url;
        return uri.searchParams.get('q') ?? url;
    }

    private static largestThumbnail(thumbnails: Thumbnail[]): string {
        const [largest] = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
        if (!largest) throw new Error('Thumbnail not found');
        return largest.url;
    }

    private static channelId(url: string): string | undefined {
        const id = YoutubeVisitor.CHANNEL_ID.exec(url)?.groups?.id;
        return id ? decodeURIComponent(id) : undefined;
    }

    private static vanityId(url: string): string | undefined {
        const id = YoutubeVisitor.VANITY_ID.exec(url)?.groups?.id;
        return id ? decodeURIComponent(id) : undefined;
    }
}
