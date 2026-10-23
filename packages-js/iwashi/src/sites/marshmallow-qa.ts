import { type HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

export class MarshmallowQaVisitor extends PatternVisitor {
    public constructor() {
        super('MarshmallowQA', String.raw`marshmallow-qa.com/(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile> {
        const url = `https://marshmallow-qa.com/${id}`;
        const page = await http.html(url);
        const name = page.querySelector('.card > .card-body > h1');
        if (!name) throw new Error('Could not find name');
        const picture = page.querySelector('.card > .card-body > * > picture > img');
        if (!picture) throw new Error('Could not find profile picture');
        return {
            site: this.name,
            id,
            url,
            name: name.text,
            description: page.querySelector('.card > .card-body > div.text-sm.leading-normal')?.text,
            profilePicture: picture.getAttribute('src'),
            links: page.querySelectorAll('.card > .card-body > ul > li > a[rel~=\'noopener\'][rel~=\'noreferrer\'][target=\'_blank\']')
                .map((link) => link.getAttribute('href'))
                .filter((href): href is string => !!href),
        };
    }
}
