import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type InitialState = {
    users: {
        users: Record<string, {
            name: string;
            description: string;
            icon: { photo: { original: { url: string } } };
            social_accounts: Record<string, { unique_name: string }>;
        }>;
    };
};

export class SketchVisitor extends PatternVisitor {
    private static readonly SOCIAL: Record<string, string> = {
        twitter: 'https://twitter.com/{name}',
        pixiv: 'https://www.pixiv.net/users/{name}',
    };

    public constructor() {
        super('Sketch', String.raw`sketch\.pixiv\.net/@(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://sketch.pixiv.net/@${id}`;
        const element = (await http.html(url)).querySelector('script#__NEXT_DATA__');
        if (!element) throw new Error(`__NEXT_DATA__ not found: ${id}`);
        const nextData = JSON.parse(element.text);
        const state: InitialState = JSON.parse(nextData.props.pageProps.initialState);
        const users = Object.values(state.users.users);
        if (users.length !== 1) throw new Error(`User is must be unique: ${id}`);
        const [user] = users;
        const links: string[] = [];
        for (const [service, account] of Object.entries(user.social_accounts)) {
            const template = SketchVisitor.SOCIAL[service];
            if (!template) throw new Error(`Unknown social accounts: ${service}`);
            links.push(template.replace('{name}', account.unique_name));
        }
        return {
            site: this.name,
            id,
            url,
            name: user.name,
            description: user.description,
            profilePicture: user.icon.photo.original.url,
            links,
        };
    }
}
