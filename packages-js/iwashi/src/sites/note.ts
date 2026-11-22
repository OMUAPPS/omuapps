import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type LdJson = {
    mainEntity: {
        name: string;
        description: string;
        image: { url: string };
    };
}[];

export class NoteVisitor extends PatternVisitor {
    public constructor() {
        super('Note', String.raw`note\.com/(?<id>[^/]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://note.com/${id}`;
        const page = await http.html(url);
        const element = page.querySelector('script[type=\'application/ld+json\']');
        if (!element) return;
        const root: LdJson = JSON.parse(element.text);
        if (root.length !== 1) throw new Error('Root element is not unique');
        const data = root[0].mainEntity;
        const links = new Set(page.querySelectorAll('.m-creatorSocialLinks__item')
            .map((item) => item.querySelector('a')?.getAttribute('href'))
            .filter((href) => href !== undefined));
        return {
            site: this.name,
            id,
            url,
            name: data.name,
            description: data.description,
            profilePicture: data.image.url,
            links: [...links],
        };
    }
}
