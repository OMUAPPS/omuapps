import { describe, expect, test } from 'bun:test';

import { Crawl, HttpClient, type RequestOptions, PatternVisitor, ProfileUrl, type SiteProfile, Sites } from '../src';
import { TransactionAnimation } from '../src/sites/x';

class FakeVisitor extends PatternVisitor {
    public readonly visited: string[] = [];

    public constructor(
        name: string,
        pattern: string,
        private readonly links: Record<string, string[]>,
    ) {
        super(name, pattern);
        this.throttle.wait = async () => {};
    }

    public async visit(id: string): Promise<SiteProfile> {
        this.visited.push(id);
        return { site: this.name, id, url: `https://${this.name}.example/${id}`, links: this.links[id] ?? [] };
    }
}

class RedirectingHttp extends HttpClient {
    public constructor(private readonly redirects: Record<string, string>) {
        super();
    }

    public async request(url: string, _options?: RequestOptions): Promise<Response> {
        const target = this.redirects[url];
        if (!target) return new Response('not found', { status: 404 });
        const response = new Response('');
        Object.defineProperty(response, 'url', { value: target });
        return response;
    }
}

describe('ProfileUrl', () => {
    test.each([
        ['youtube.com/@name', 'https://youtube.com/@name'],
        ['http://www.example.com/a?b=c', 'https://www.example.com/a?b=c'],
        ['  https://lit.link/%E3%81%82  ', 'https://lit.link/あ'],
        ['not a url', undefined],
    ])('normalizes %p', (input, expected) => {
        expect(ProfileUrl.normalize(input)).toBe(expected);
    });
});

describe('site patterns', () => {
    test.each([
        ['https://www.twitch.tv/someone', 'Twitch', 'someone'],
        ['https://picarto.tv/artist', 'Picarto', 'artist'],
        ['https://x.com/account', 'X', 'account'],
        ['https://twitter.com/#!/account', 'X', 'account'],
        ['https://shop.booth.pm', 'Booth', 'shop'],
        ['https://lit.link/name', 'LitLink', 'name'],
        ['https://sketch.pixiv.net/@painter', 'Sketch', 'painter'],
        ['https://www.pixiv.net/users/123', 'Pixiv', '123'],
        ['https://itch.io/profile/maker', 'itch.io', 'maker'],
        ['https://maker.itch.io/', 'itch.io', 'maker'],
    ])('%p is handled by %p', async (url, site, id) => {
        const visitors = Sites.all.filter((visitor) => visitor.matches(url));
        expect(visitors.map((visitor) => visitor.name)).toContain(site);
        const visitor = visitors.find((candidate) => candidate.name === site);
        expect(await visitor?.resolveId(url, new HttpClient())).toBe(id);
    });

    test('does not treat sketch.pixiv.net as a pixiv user page', () => {
        expect(Sites.all.filter((visitor) => visitor.matches('https://sketch.pixiv.net/@painter')).map((visitor) => visitor.name)).toEqual(['Sketch']);
    });
});

describe('Crawl', () => {
    test('builds a tree from the links of each profile', async () => {
        const hub = new FakeVisitor('hub', String.raw`hub\.example/(?<id>\w+)`, { root: ['https://hub.example/child', 'https://leaf.example/a'] });
        const leaf = new FakeVisitor('leaf', String.raw`leaf\.example/(?<id>\w+)`, {});
        const tree = await new Crawl([hub, leaf], new RedirectingHttp({})).tree('https://hub.example/root');
        expect(tree?.profile.id).toBe('root');
        expect(tree?.children.map((child) => child.profile.id).sort()).toEqual(['a', 'child']);
        expect(tree?.flatten().map((profile) => profile.id).sort()).toEqual(['a', 'child', 'root']);
    });

    test('visits each account once even when linked twice', async () => {
        const hub = new FakeVisitor('hub', String.raw`hub\.example/(?<id>\w+)`, {
            root: ['https://hub.example/child', 'https://www.hub.example/child'],
            child: ['https://hub.example/root'],
        });
        await new Crawl([hub], new RedirectingHttp({})).tree('https://hub.example/root');
        expect(hub.visited.sort()).toEqual(['child', 'root']);
    });

    test('keeps a profile found through a redirect in the tree', async () => {
        const hub = new FakeVisitor('hub', String.raw`hub\.example/(?<id>\w+)`, { root: ['https://short.example/abc'] });
        const http = new RedirectingHttp({ 'https://short.example/abc': 'https://hub.example/target' });
        const tree = await new Crawl([hub], http).tree('https://hub.example/root');
        expect(tree?.children.map((child) => child.profile.id)).toEqual(['target']);
    });
});

describe('X transaction animation', () => {
    const PYTHON: [number[], number, string][] = [
        [[255, 0, 128, 10, 200, 30, 100, 12, 34, 56, 78], 0.0, 'ff0800100000100'],
        [[255, 0, 128, 10, 200, 30, 100, 12, 34, 56, 78], 0.125, '15a0a50000000000'],
        [[255, 0, 128, 10, 200, 30, 100, 12, 34, 56, 78], 0.3, '1300940000000000'],
        [[255, 0, 128, 10, 200, 30, 100, 12, 34, 56, 78], 0.75, '776f4a0000000000'],
        [[255, 0, 128, 10, 200, 30, 100, 12, 34, 56, 78], 1.0, 'ac81e0100000100'],
        [[10, 20, 30, 40, 50, 60, 255, 200, 100, 50, 25], 0.0, 'a141e0100000100'],
        [[10, 20, 30, 40, 50, 60, 255, 200, 100, 50, 25], 0.125, '9131d0000000000'],
        [[10, 20, 30, 40, 50, 60, 255, 200, 100, 50, 25], 0.3, '6101a0000000000'],
        [[10, 20, 30, 40, 50, 60, 255, 200, 100, 50, 25], 0.75, '16202a0000000000'],
        [[10, 20, 30, 40, 50, 60, 255, 200, 100, 50, 25], 1.0, '28323c0100000100'],
        [[0, 0, 0, 255, 255, 255, 0, 128, 128, 128, 128], 0.0, '0000100000100'],
        [[0, 0, 0, 255, 255, 255, 0, 128, 128, 128, 128], 0.3, '4440100000100'],
        [[0, 0, 0, 255, 255, 255, 0, 128, 128, 128, 128], 0.75, '8282820000000000'],
        [[0, 0, 0, 255, 255, 255, 0, 128, 128, 128, 128], 1.0, 'ffffff0000000000'],
    ];

    test.each(PYTHON)('matches Python for %p at %p', (row, time, expected) => {
        expect(TransactionAnimation.key(row, time)).toBe(expected);
    });
});
