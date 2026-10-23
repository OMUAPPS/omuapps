import { HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type CreatorResponse = {
    error?: string;
    body: {
        description: string;
        profileLinks: string[];
        user: { name: string; iconUrl: string };
    };
};

export class FanboxVisitor extends PatternVisitor {
    public constructor() {
        super('Fanbox', String.raw`(?<id>[\w-]+)\.fanbox\.cc`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://${id}.fanbox.cc`;
        const response = await http.request('https://api.fanbox.cc/creator.get', {
            params: { creatorId: id },
            headers: { 'accept': 'application/json', 'origin': url, 'referer': `${url}/` },
        });
        if (HttpClient.isChallenge(response)) {
            console.warn(`[Fanbox] Detected Cloudflare challenge for ${url}`);
            return;
        }
        if (Math.floor(response.status / 100) === 4) {
            console.warn(`[Fanbox] Could not find user for ${url}`);
            return;
        }
        const info: CreatorResponse = await HttpClient.ensureOk(response).json();
        if (info.error) {
            console.warn(`[Fanbox] Could not find user for ${url}`);
            return;
        }
        return {
            site: this.name,
            id,
            url,
            name: info.body.user.name,
            description: info.body.description,
            profilePicture: info.body.user.iconUrl,
            links: info.body.profileLinks,
        };
    }
}
