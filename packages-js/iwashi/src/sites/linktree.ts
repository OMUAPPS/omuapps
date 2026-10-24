import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type NextData = {
    props: {
        pageProps: {
            description: string | null;
            profilePictureUrl: string | null;
            links: { url: string | null }[];
        };
    };
};

export class LinktreeVisitor extends PatternVisitor {
    public constructor() {
        super('Linktree', String.raw`linktr\.ee/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://linktr.ee/${id}`;
        const element = (await http.html(url)).querySelector('#__NEXT_DATA__');
        if (!element) throw new Error(`[Linktree] Could not find data for ${url}`);
        const info = (JSON.parse(element.text) as NextData).props.pageProps;
        return {
            site: this.name,
            id,
            url,
            description: info.description ?? undefined,
            profilePicture: info.profilePictureUrl ?? undefined,
            links: info.links.map((link) => link.url).filter((link): link is string => !!link),
        };
    }
}
