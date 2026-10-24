import { type HttpClient, PatternVisitor, ProfileUrl, type SiteProfile } from '../crawl';

export class BoothVisitor extends PatternVisitor {
    public constructor() {
        super('Booth', String.raw`(?<id>[\w-]+)\.booth\.pm`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://${id}.booth.pm`;
        const page = await http.html(url);
        const description = page.querySelector('.booth-description .autolink');
        const avatarStyle = page.querySelector('.avatar-image')?.getAttribute('style');
        const links = description
            ? page.querySelectorAll('.booth-description a')
                .map((link) => ProfileUrl.normalize(link.getAttribute('href') ?? ''))
                .filter((link) => link !== undefined)
            : [];
        return {
            site: this.name,
            id,
            url,
            name: page.querySelector('.shop-name')?.text,
            description: description?.text,
            profilePicture: avatarStyle?.split('url(')[1]?.split(')')[0],
            links,
        };
    }
}
