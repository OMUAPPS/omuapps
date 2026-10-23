import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type InitialData = {
    state: {
        userDetails: {
            userDetails: {
                user: {
                    nickname: string;
                    description: string;
                    icons: { large: string };
                    sns: { url: string }[];
                };
            };
        };
    };
};

export class NicovideoVisitor extends PatternVisitor {
    public constructor() {
        super('Nicovideo', String.raw`(sp\.)?nicovideo\.jp/(?<path>user|mylist)/(?<id>\d+)`);
    }

    public async resolveId(url: string, http: HttpClient): Promise<string | undefined> {
        const groups = this.pattern.exec(url)?.groups;
        if (!groups) return url;
        if (groups.path !== 'mylist') return groups.id;
        const response = await http.ok(`https://www.nicovideo.jp/mylist/${groups.id}`);
        if (response.url === url) return;
        return this.resolveId(response.url, http);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://www.nicovideo.jp/user/${id}`;
        const element = (await http.html(url)).querySelector('#js-initial-userpage-data');
        if (!element) {
            console.warn(`[Nicovideo] ${id} not found`);
            return;
        }
        const data: InitialData = JSON.parse(element.getAttribute('data-initial-data') ?? '');
        const { user } = data.state.userDetails.userDetails;
        return {
            site: this.name,
            id,
            url,
            name: user.nickname,
            description: user.description,
            profilePicture: user.icons.large,
            links: user.sns.map((link) => link.url),
        };
    }
}
