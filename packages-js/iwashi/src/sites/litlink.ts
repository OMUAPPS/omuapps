import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type NextData = {
    props: {
        pageProps: {
            profile: {
                name: string;
                profileText: string;
                pictureUrl: string;
                snsIconLinks: { url?: string }[];
                profileLinks: { buttonLink?: { url: string } | null }[];
            };
        };
    };
};

export class LitLinkVisitor extends PatternVisitor {
    public constructor() {
        super('LitLink', String.raw`lit\.link/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://lit.link/${id}`;
        const element = (await http.html(url)).querySelector('#__NEXT_DATA__');
        if (!element) {
            console.warn(`[LitLink] Could not find data element for ${url}`);
            return;
        }
        const { profile } = (JSON.parse(element.text) as NextData).props.pageProps;
        return {
            site: this.name,
            id,
            url,
            name: profile.name,
            description: profile.profileText,
            profilePicture: profile.pictureUrl,
            links: [
                ...profile.snsIconLinks.map((link) => link.url),
                ...profile.profileLinks.map((link) => link.buttonLink?.url),
            ].filter((link) => link !== undefined),
        };
    }
}
