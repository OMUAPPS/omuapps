import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type ArtistResponse = {
    data: {
        artistUnion: {
            profile: {
                name: string;
                biography: { text: string };
                externalLinks: { items: { url: string }[] };
            };
            visuals: {
                avatarImage: { sources: { url: string; width: number; height: number }[] } | null;
            };
        };
    };
};

export class SpotifyVisitor extends PatternVisitor {
    private static readonly QUERY_HASH = 'da986392124383827dc03cbb3d66c1de81225244b6e20f8d78f9f802cc43df6e';

    public constructor() {
        super('Spotify', String.raw`(open\.)?spotify\.com\/(intl-[\w]*\/)?artist\/(?<id>[0-9a-zA-Z]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://open.spotify.com/artist/${id}`;
        const session = (await http.html(url)).querySelector('script#session');
        if (!session) throw new Error('Token not found');
        const { accessToken } = JSON.parse(session.text) as { accessToken: string };
        const data = await http.json<ArtistResponse>('https://api-partner.spotify.com/pathfinder/v1/query', {
            params: {
                variables: JSON.stringify({ uri: `spotify:artist:${id}`, includePrerelease: true }),
                extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SpotifyVisitor.QUERY_HASH } }),
            },
            headers: { 'authorization': `Bearer ${accessToken}`, 'content-type': 'application/json' },
        });
        const { profile, visuals } = data.data.artistUnion;
        const sources = [...(visuals.avatarImage?.sources ?? [])].sort((a, b) => a.width * a.height - b.width * b.height);
        return {
            site: this.name,
            id,
            url,
            name: profile.name,
            description: profile.biography.text,
            profilePicture: sources.at(-1)?.url,
            links: profile.externalLinks.items.map((item) => item.url),
        };
    }
}
