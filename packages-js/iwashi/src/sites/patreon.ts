import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type LdJson = {
    author: { name: string; image: { contentUrl: string } };
    about: { description: string };
    sameAs?: string[];
};

export class PatreonVisitor extends PatternVisitor {
    public constructor() {
        super('Patreon', String.raw`patreon\.com/(?<id>[\w-]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://www.patreon.com/${id}`;
        const element = (await http.html(url)).querySelector('script[type=\'application/ld+json\']');
        if (!element) throw new Error('Could not find ld+json');
        const data: LdJson = JSON.parse(element.text);
        return {
            site: this.name,
            id,
            url,
            name: data.author.name,
            description: data.about.description,
            profilePicture: data.author.image.contentUrl,
            links: data.sameAs ?? [],
        };
    }
}
