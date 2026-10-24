import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type BandData = {
    name: string;
    sites: { url: string }[];
};

export class BandcampVisitor extends PatternVisitor {
    public constructor() {
        super('Bandcamp', String.raw`(?<id>[\w-]+)?\.bandcamp\.com`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://${id}.bandcamp.com`;
        const page = await http.html(url);
        const script = page.querySelector('script[data-band]');
        if (!script) throw new Error('No script found');
        const data: BandData = JSON.parse(script.getAttribute('data-band') ?? '');
        return {
            site: this.name,
            id,
            url,
            name: data.name,
            description: page.querySelector('.signed-out-artists-bio-text')?.text.trim(),
            profilePicture: page.querySelector('.band-photo')?.getAttribute('src'),
            links: data.sites.map((site) => site.url),
        };
    }
}
