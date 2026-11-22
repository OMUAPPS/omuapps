import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type ProfileResponse = {
    data: {
        id: number;
        name: string;
        bio: string;
        avatar: string;
        social_medias: { link: string }[];
    };
};

export class PicartoVisitor extends PatternVisitor {
    public constructor() {
        super('Picarto', String.raw`picarto\.tv/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const { data } = await http.json<ProfileResponse>(`https://ptvintern.picarto.tv/api/channel/profile/${id}`, {
            headers: { 'accept': 'application/json, text/plain, */*', 'content-type': 'application/json' },
        });
        return {
            site: this.name,
            id,
            uniqueId: String(data.id),
            url: `https://picarto.tv/${data.name}`,
            name: data.name,
            description: data.bio,
            profilePicture: data.avatar,
            links: data.social_medias.map((social) => social.link),
        };
    }
}
