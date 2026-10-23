import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

export class ItchioVisitor extends PatternVisitor {
    public constructor() {
        super('itch.io', String.raw`((?<subdomain>[\w-]+)\.itch\.io/|itch\.io/profile/(?<profile>[\w-]+))`);
    }

    public async resolveId(url: string): Promise<string | undefined> {
        const groups = this.pattern.exec(url)?.groups;
        return groups?.profile ?? groups?.subdomain;
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://${id}.itch.io`;
        const page = await http.html(url);
        const profile = await http.html(`https://itch.io/profile/${id}`);
        return {
            site: this.name,
            id,
            url,
            name: profile.querySelector('meta[property="og:title"]')?.getAttribute('content'),
            profilePicture: profile.querySelector('.avatar')?.getAttribute('style')?.split('url(\'')[1]?.split('\')')[0],
            links: page.querySelectorAll('.link_group a').map((link) => link.getAttribute('href')).filter((href) => href !== undefined),
        };
    }
}
