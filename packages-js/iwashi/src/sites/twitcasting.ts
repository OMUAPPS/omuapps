import { type HttpClient, PatternVisitor, ProfileUrl, type SiteProfile } from '../crawl';

export class TwitCastingVisitor extends PatternVisitor {
    public constructor() {
        super('TwitCasting', String.raw`twitcasting\.tv/(?<id>[-\w]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://twitcasting.tv/${id}`;
        const page = await http.html(url);
        const title = page.querySelector('meta[property=\'og:title\']');
        if (!title) {
            console.warn(`[TwitCasting] Could not find name for ${url}`);
            return;
        }
        const image = page.querySelector('meta[property=\'og:image\']')?.getAttribute('content');
        const links = new Set(page.querySelectorAll('.tw-live-author__commandbox--socials a').map((link) => String(link.getAttribute('href'))));
        return {
            site: this.name,
            id,
            url,
            name: title.getAttribute('content'),
            description: page.querySelector('meta[name="description"]')?.getAttribute('content'),
            profilePicture: image ? ProfileUrl.normalize(image) : undefined,
            links: [...links].filter((link) => !link.startsWith('/')),
        };
    }
}
