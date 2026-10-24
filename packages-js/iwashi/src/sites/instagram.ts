import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type ProfileInfo = {
    data: {
        user: {
            full_name: string;
            profile_pic_url: string;
            biography: string;
            bio_links: { url: string }[];
        };
    };
};

export class InstagramVisitor extends PatternVisitor {
    private static readonly APP_ID = /"X-IG-App-ID": ?"(?<id>\d{15})"/;

    public constructor() {
        super('Instagram', String.raw`instagram\.com/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://www.instagram.com/${id}`;
        const appId = InstagramVisitor.APP_ID.exec(await http.text(url))?.groups?.id;
        if (!appId) throw new Error(`[Instagram] No X-IG-App-ID found in ${url}`);
        const response = await http.ok('https://www.instagram.com/api/v1/users/web_profile_info/', {
            params: { username: id },
            headers: { 'x-ig-app-id': appId },
        });
        if (response.redirected) {
            console.warn('[Instagram] Blocked by Instagram');
            return { site: this.name, id, url, name: id, description: 'Blocked by Instagram', links: [] };
        }
        const { user } = (await response.json() as ProfileInfo).data;
        return {
            site: this.name,
            id,
            url,
            name: user.full_name,
            profilePicture: user.profile_pic_url,
            description: user.biography,
            links: user.bio_links.map((link) => link.url),
        };
    }
}
