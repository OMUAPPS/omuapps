import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type PreloadData = {
    user: Record<string, {
        name: string;
        comment: string;
        imageBig: string;
        webpage?: string | null;
        social?: Record<string, { url: string }> | [] | null;
    }>;
};

type SketchPosts = {
    data: { user: { url: string } };
};

export class PixivVisitor extends PatternVisitor {
    public constructor() {
        super('Pixiv', String.raw`pixiv\.net/users/(?<id>\d+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://www.pixiv.net/users/${id}`;
        const meta = (await http.html(url)).querySelector('meta[name="preload-data"][id="meta-preload-data"]');
        if (!meta) {
            console.warn(`[Pixiv] meta-preload-data not found: ${id}`);
            return;
        }
        const users = Object.values((JSON.parse(meta.getAttribute('content') ?? '') as PreloadData).user);
        if (users.length !== 1) {
            console.warn(`[Pixiv] User is must be unique: ${id}`);
            return;
        }
        const [user] = users;
        const links = [
            ...(user.webpage ? [user.webpage] : []),
            ...Object.values(user.social ?? {}).map((link) => link.url),
        ];
        const sketch = await http.request('https://sketch.pixiv.net/api/pixiv/user/posts/latest', { params: { user_id: id } });
        if (sketch.status === 200) {
            links.push(((await sketch.json()) as SketchPosts).data.user.url);
        }
        return {
            site: this.name,
            id,
            url,
            name: user.name,
            description: user.comment,
            profilePicture: user.imageBig,
            links,
        };
    }
}
