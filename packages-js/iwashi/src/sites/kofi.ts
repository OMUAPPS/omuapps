import { HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

export class KofiVisitor extends PatternVisitor {
    public constructor() {
        super('Ko-fi', String.raw`ko-fi\.com/(?<id>[\w-]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://ko-fi.com/${id}`;
        const response = await http.request(url);
        if (HttpClient.isChallenge(response)) {
            console.warn(`[Kofi] Detected Cloudflare challenge for ${url}`);
            return;
        }
        const page = HttpClient.parse(await HttpClient.ensureOk(response).text());
        return {
            site: this.name,
            id,
            url,
            name: page.querySelector('.mob-profile-name')?.text.trim(),
            profilePicture: page.querySelector('#profilePicture2')?.getAttribute('src'),
            links: page.querySelectorAll('.social-link a').map((link) => link.getAttribute('href')).filter((href) => href !== undefined),
        };
    }
}
