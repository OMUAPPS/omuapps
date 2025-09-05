import type { Omu } from '@omujs/omu';
import type { Cookie } from '@omujs/omu/api/dashboard';
import { DomUtils, parseDocument } from 'htmlparser2';

const LOGIN_SCRIPT = `
const regex = /^\\/?[\\w]+$/gm;
if (regex.test(location.pathname)) {
    close();
}
if (location.pathname.startsWith('/session/new')) {
    document.cookie = '';
}
`;
export class MarshmallowAPI {
    private constructor(
        private readonly fetch: (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>,
        private readonly headers: Record<string, string>,
    ) {}

    private static serializeCookieString(cookies: Cookie[]): string {
        return cookies
            .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
            .join('; ');
    }

    private static async getCookies(omu: Omu): Promise<Cookie[] | undefined> {
        const url = 'https://marshmallow-qa.com/session/new';
        const cookies = (await omu.dashboard.getCookies({
            url,
        })).unwrap();
        const session = cookies.find(
            ({ name }) => name === '_marshmallow_session',
        )?.value;
        if (session) {
            return cookies;
        }
        return this.login(omu);
    }
    private static async login(omu: Omu): Promise<Cookie[] | undefined> {
        const url = 'https://marshmallow-qa.com/session/new';
        const allowed = await omu.dashboard.requestHost({
            host: 'marshmallow-qa.com',
        });
        if (allowed.type !== 'ok') throw new Error('Failed to request host permission');
        const handle = (
            await omu.dashboard.requestWebview({
                url,
                script: LOGIN_SCRIPT,
            })
        ).unwrap();
        await handle.join();
        const cookies = await handle.getCookies();
        const session = cookies.find(
            ({ name }) => name === '_marshmallow_session',
        )?.value;
        if (!session) {
            throw new Error('No session cookie found');
        }
        return cookies;
    }

    public static async fromOmu(omu: Omu) {
        const cookie = await this.getCookies(omu);
        if (!cookie) {
            throw new Error('Failed to get cookies');
        }
        return new MarshmallowAPI((request) => omu.http.fetch(request), {
            accept: 'application/json',
            'accept-language': 'ja,en;q=0.9,en-GB;q=0.8,en-US;q=0.7',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
            priority: 'u=1, i',
            'sec-ch-ua':
                '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            cookie: this.serializeCookieString(cookie),
        });
    }

    private parseAnswerFragment(fragment: string) {
        const dom = parseDocument(fragment);
        const answer = DomUtils.findOne((it) => it.name === 'li', dom);
        if (!answer) {
            throw new Error('No answer found');
        }
        const updatedAt = DomUtils.getAttributeValue(answer, 'data-updated-at');
        const message = DomUtils.findOne((it) => DomUtils.hasAttrib(it, 'data-message-card-target'), answer);
        const content = DomUtils.findOne((it) => DomUtils.getAttributeValue(it, 'data-obscene-word-target') === 'content', answer);
    }

    public async answers(options: {
        before: Date
    }) {
        const timestamp = options.before
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '');
        const resp = await this.fetch(
            `https://marshmallow-qa.com/users/4936668/answers?before=${timestamp}`,
            {
                headers: this.headers,
                body: null,
                method: 'GET',
            },
        );
        const data: {
            id: number,
            fragment: string,
        }[] = await resp.json();
    }
}
