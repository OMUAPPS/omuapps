import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type SkebUser = {
    name: string;
    description: string;
    avatar_url: string;
    url: string | null;
    user_service_links?: { provider: string; screen_name: string }[];
} & Record<string, unknown>;

export class SkebVisitor extends PatternVisitor {
    private static readonly PROVIDERS: Record<string, string | undefined> = {
        nijie_id: undefined,
        dlsite_id: undefined,
        fanza_id: undefined,
        pixiv_id: 'https://www.pixiv.net/member.php?id={id}',
        booth_id: 'https://{id}.booth.pm',
        fantia_id: 'https://fantia.jp/fanclubs/{id}',
        fanbox_id: 'https://{id}.fanbox.cc',
        skima_id: 'https://skima.jp/profile?id={id}',
        coconala_id: 'https://coconala.com/users/{id}',
        patreon_id: 'https://www.patreon.com/{id}',
        wishlist_id: undefined,
        youtube_id: 'https://www.youtube.com/channel/{id}',
    };

    private static readonly SERVICES: Record<string, string> = {
        twitter: 'https://twitter.com/{screen_name}',
    };

    private requestKey: string | undefined;

    public constructor() {
        super('Skeb', String.raw`skeb\.jp/@(?<id>[\w-]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://skeb.jp/@${id}`;
        const requestKey = await this.fetchRequestKey(http, url);
        const data = await http.json<SkebUser>(`https://skeb.jp/api/users/${id}`, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'ja',
                'authorization': 'Bearer null',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'Referer': url,
                ...(requestKey ? { Cookie: `request_key=${requestKey}` } : {}),
            },
        });
        const links: string[] = data.url ? [data.url] : [];
        for (const [key, template] of Object.entries(SkebVisitor.PROVIDERS)) {
            const value = data[key];
            if (value === null || value === undefined) continue;
            if (!template) {
                console.warn(`[Skeb] ${key} is not supported`);
                continue;
            }
            links.push(template.replace('{id}', String(value)));
        }
        for (const link of data.user_service_links ?? []) {
            const template = SkebVisitor.SERVICES[link.provider];
            if (!template) {
                console.warn(`[Skeb] Could not find ${link.provider}`);
                continue;
            }
            links.push(template.replace('{screen_name}', link.screen_name));
        }
        return {
            site: this.name,
            id,
            url,
            name: data.name,
            description: data.description,
            profilePicture: data.avatar_url,
            links,
        };
    }

    private async fetchRequestKey(http: HttpClient, url: string): Promise<string | undefined> {
        if (this.requestKey) return this.requestKey;
        const response = await http.request(url);
        for (const cookie of response.headers.getSetCookie()) {
            const [pair] = cookie.split(';');
            const [name, value] = pair.split('=');
            if (name.trim() !== 'request_key') continue;
            this.requestKey = value;
            return value;
        }
        console.warn('[Skeb] Could not find request_key');
        return;
    }
}
