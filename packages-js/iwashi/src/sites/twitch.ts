import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type AboutPanel = {
    data: {
        user: {
            displayName: string;
            description: string;
            profileImageURL: string;
            channel: { socialMedias: { url: string }[] };
        } | null;
    };
}[];

export class TwitchVisitor extends PatternVisitor {
    private static readonly CLIENT_ID = /clientId ?= ?"(?<token>kimne78kx3ncx6brgo4mv6wki5h1ko)"/;
    private static readonly QUERY_HASH = '6089531acef6c09ece01b440c41978f4c8dc60cb4fa0124c9a9d3f896709b6c6';

    public constructor() {
        super('Twitch', String.raw`twitch\.tv/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://www.twitch.tv/${id}`;
        const token = TwitchVisitor.CLIENT_ID.exec(await http.text(url))?.groups?.token;
        if (!token) {
            console.warn(`[Twitch] Could not find token for ${url}`);
            return;
        }
        const [info] = await http.json<AboutPanel>('https://gql.twitch.tv/gql', {
            json: [{
                operationName: 'ChannelRoot_AboutPanel',
                variables: { channelLogin: id, skipSchedule: true },
                extensions: { persistedQuery: { version: 1, sha256Hash: TwitchVisitor.QUERY_HASH } },
            }],
            headers: { 'Client-Id': token },
        });
        const { user } = info.data;
        if (!user) {
            console.warn(`[Twitch] Could not find user for ${url}`);
            return;
        }
        return {
            site: this.name,
            id,
            url,
            name: user.displayName,
            description: user.description,
            profilePicture: user.profileImageURL,
            links: user.channel.socialMedias.map((link) => link.url),
        };
    }
}
