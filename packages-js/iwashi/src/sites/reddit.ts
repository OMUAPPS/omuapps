import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type About = {
    data: {
        name: string;
        icon_img: string;
        subreddit: { public_description: string };
    };
};

type SocialLink = {
    social_link: { url: string };
};

export class RedditVisitor extends PatternVisitor {
    public constructor() {
        super('Reddit', String.raw`reddit\.com/user/(?<id>[\w-]+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://www.reddit.com/user/${id}`;
        const { data } = await http.json<About>(`https://www.reddit.com/user/${id}/about.json`);
        const page = await http.html(`https://www.reddit.com/user/${id}/`);
        const links = page.querySelectorAll('[noun="social_link"]').map((element) => {
            const context: SocialLink = JSON.parse(element.getAttribute('data-faceplate-tracking-context') ?? '');
            return context.social_link.url;
        });
        return {
            site: this.name,
            id,
            url,
            name: data.name,
            description: data.subreddit.public_description,
            profilePicture: data.icon_img,
            links,
        };
    }
}
