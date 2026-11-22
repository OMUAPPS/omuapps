import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type RateLimit = { rate: { remaining: number; reset: number } };
type UserInfo = { name: string | null; bio: string | null; avatar_url: string };
type SocialLink = { url: string };

export class GithubVisitor extends PatternVisitor {
    public constructor() {
        super('Github', String.raw`github\.com/(?<id>[\w-]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        await this.waitForRateLimit(http);
        const info = await http.json<UserInfo>(`https://api.github.com/users/${id}`);
        const links = await http.json<SocialLink[]>(`https://api.github.com/users/${id}/social_accounts`);
        return {
            site: this.name,
            id,
            url: `https://github.com/${id}`,
            name: info.name ?? undefined,
            description: info.bio ?? undefined,
            profilePicture: info.avatar_url,
            links: links.map((link) => link.url),
        };
    }

    private async waitForRateLimit(http: HttpClient): Promise<void> {
        const { rate } = await http.json<RateLimit>('https://api.github.com/rate_limit');
        if (rate.remaining > 0) return;
        console.info(`[Github] Rate limit reached. Waiting until ${rate.reset}`);
        await Bun.sleep(Math.max(0, rate.reset * 1000 - Date.now()));
    }
}
