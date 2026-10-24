import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type Hydration = {
    hydratable: string;
    data: {
        username: string;
        description: string;
        avatar_url: string;
        urn: string;
    };
}[];

export class SoundcloudVisitor extends PatternVisitor {
    private static readonly HYDRATION = /window\.__sc_hydration ?= ?(?<info>.+);/;
    private static readonly CLIENT_ID = /client_id: ?"(?<id>\w{32})"/;

    public constructor() {
        super('Soundcloud', String.raw`soundcloud\.com/(?<id>[-\w]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://soundcloud.com/${id}`;
        const hydration = SoundcloudVisitor.HYDRATION.exec(await http.text(url))?.groups?.info;
        if (!hydration) {
            console.warn(`[Soundcloud] Could not find info for ${url}`);
            return;
        }
        const user = (JSON.parse(hydration) as Hydration).find((item) => item.hydratable === 'user');
        if (!user) {
            console.warn(`[Soundcloud] Could not find user info for ${url}`);
            return;
        }
        const profile: SiteProfile = {
            site: this.name,
            id,
            url,
            name: user.data.username,
            description: user.data.description,
            profilePicture: user.data.avatar_url,
            links: [],
        };
        const clientId = SoundcloudVisitor.CLIENT_ID.exec(await http.text('https://a-v2.sndcdn.com/assets/0-bf97f26a.js'))?.groups?.id;
        if (!clientId) {
            console.warn(`[Soundcloud] Could not find client_id for ${url}`);
            return profile;
        }
        const webProfiles = await http.json<{ url: string }[]>(`https://api-v2.soundcloud.com/users/${user.data.urn}/web-profiles`, {
            params: { client_id: clientId },
            headers: {
                'Accept-Language': 'ja,en;q=0.9,en-GB;q=0.8,en-US;q=0.7',
                'Cache-Control': 'no-cache',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
            },
        });
        profile.links = webProfiles.map((item) => item.url);
        return profile;
    }
}
