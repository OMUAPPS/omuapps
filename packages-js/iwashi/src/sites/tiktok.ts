import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type UniversalData = {
    __DEFAULT_SCOPE__: {
        'webapp.user-detail': {
            userInfo: {
                user: { nickname: string; signature: string; avatarLarger: string };
            };
        };
    };
};

export class TikTokVisitor extends PatternVisitor {
    public constructor() {
        super('TikTok', String.raw`tiktok\.com/@(?<id>[-\w]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://www.tiktok.com/@${id}`;
        const element = (await http.html(url)).querySelector('script#__UNIVERSAL_DATA_FOR_REHYDRATION__');
        if (!element) throw new Error(`Cound not find data for ${url}`);
        const data: UniversalData = JSON.parse(element.text);
        const { user } = data.__DEFAULT_SCOPE__['webapp.user-detail'].userInfo;
        return {
            site: this.name,
            id,
            url,
            name: user.nickname,
            description: user.signature,
            profilePicture: user.avatarLarger,
            links: [],
        };
    }
}
