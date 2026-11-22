import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type Profile = {
    name: string;
    description: string;
    profile_image_url: string;
    links: { url: string }[];
};

export class MirrativVisitor extends PatternVisitor {
    public constructor() {
        super('Mirrativ', String.raw`mirrativ.com/user/(?<id>[\d]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const token = (await http.html('https://www.mirrativ.com/')).querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!token) throw new Error('Could not find csrf-token');
        const info = await http.json<Profile>('https://www.mirrativ.com/api/user/profile', {
            params: { user_id: id },
            headers: { 'accept': 'application/json', 'x-csrf-token': token },
        });
        return {
            site: this.name,
            id,
            url: `https://www.mirrativ.com/user/${id}`,
            name: info.name,
            description: info.description,
            profilePicture: info.profile_image_url,
            links: info.links.map((link) => link.url),
        };
    }
}
