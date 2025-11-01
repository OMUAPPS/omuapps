import type { Omu } from '@omujs/omu';
import type { AnyNode, Element, ParentNode } from 'domhandler';
import { DomUtils, ElementType, parseDocument } from 'htmlparser2';

async function script() {
    if (/^\/[\w]+$/gm.test(location.pathname)) {
        const notification = document.querySelector('*[data-notification-lifetime-value]');
        if (notification) {
            close();
            return;
        }
        const session = document.querySelector('form[action="/session"]');
        if (session && session instanceof HTMLFormElement) {
            session.submit();
        }
    }
    if (location.pathname === '/') {
        location.href = 'https://marshmallow-qa.com/session/new';
    }
}

const LOGIN_SCRIPT = `
${script.toString()}
window.addEventListener('DOMContentLoaded', () => {
    ${script.name}();
    
    let lastPath = location.pathname;
    setInterval(() => {
        if (lastPath !== location.pathname) {
            ${script.name}();
            lastPath = location.pathname;
        }
    }, 300);
});
`;

export type ContentBlock = {
    type: 'text';
    body: string;
} | {
    type: 'img';
    src: string;
} | {
    type: 'block';
    children: ContentBlock[];
};

export type Message = {
    id: string;
    content: ContentBlock;
    date?: string;
    reply?: ContentBlock;
};

export type AnswerMessage = Message & {
    iso8601: Date;
};

type QueryOptions = {
    name?: string | string[];
    attrs?: Record<string, string | RegExp | null>;
};

export class DOM {
    private static createTester(options: QueryOptions) {
        const testName = (it: Element) => {
            if (!options.name) return true;
            if (Array.isArray(options.name)) {
                return options.name.includes(it.name);
            } else {
                return it.name === options.name;
            }
        };
        const testAttrs = (it: Element) => {
            if (!options.attrs) return true;
            return Object.entries(options.attrs).every(([key, value]) => {
                const attr = DomUtils.getAttributeValue(it, key);
                if (attr === undefined) return false;
                if (value instanceof RegExp) {
                    return value.test(attr);
                } else if (typeof value === 'string') {
                    return attr === value;
                }
                return true;
            });
        };
        return (it: Element) => {
            return testName(it) && testAttrs(it);
        };
    }

    public static query(element: ParentNode | AnyNode[], options: QueryOptions): Element | undefined {
        const test = this.createTester(options);
        return DomUtils.findOne(test, element) ?? undefined;
    }

    public static queryAll(element: ParentNode | AnyNode[], options: QueryOptions): Element[] {
        const test = this.createTester(options);
        return DomUtils.findAll(test, element);
    }

    public static serialize(element: AnyNode): ContentBlock {
        if (element.type === ElementType.Text) {
            return {
                type: 'text',
                body: element.data,
            };
        } else if (element.type === ElementType.Tag) {
            if (element.name === 'img') {
                const src = DomUtils.getAttributeValue(element, 'src') ?? '';
                return {
                    type: 'img',
                    src,
                };
            } else {
                return {
                    type: 'block',
                    children: [...element.children
                        .filter((child): child is Element => child.type === ElementType.Tag || child.type === ElementType.Text)
                        .map(child => this.serialize(child))],
                };
            }
        }
        throw new Error(`Unsupported element type: ${element.type}`);
    }

    public static blockToString(block: ContentBlock): string {
        if (block.type === 'text') {
            return block.body;
        } else if (block.type === 'img') {
            return '';
        } else if (block.type === 'block') {
            return block.children.map(child => this.blockToString(child)).join('');
        }
        throw new Error(`Unsupported block type: ${block}`);
    }
}

export type User = {
    nickname: string;
    description: string;
    image?: string;
    premium?: boolean;
};

export class MarshmallowSession {
    private constructor(
        private readonly cookie: string,
        public readonly id: string,
        public readonly displayId: string,
    ) {}

    private static async fetchId(omu: Omu, cookie: string): Promise<{ id: string; displayId: string } | undefined> {
        const idResp = await omu.http.fetch('https://marshmallow-qa.com/', {
            headers: {
                cookie,
            },
        });
        const idUrl = new URL(idResp.url);
        const id = idUrl.pathname.split('/')[1];
        if (!id) {
            console.warn('No user id found in URL');
            return;
        }
        const dom = parseDocument(await idResp.text());
        const userId = DOM.query(dom, {
            name: 'input',
            attrs: { name: 'message[user_id]' },
        });
        if (!userId) {
            throw new Error('No user id found');
        }
        const value = userId.attribs.value;
        if (!value) {
            throw new Error('No user id value found');
        }
        return { id: value, displayId: id };
    }

    public static async get(omu: Omu): Promise<MarshmallowSession | undefined> {
        const url = 'https://marshmallow-qa.com/';
        const cookies = (await omu.dashboard.getCookies({
            url,
        })).unwrap();
        const session = cookies.find(
            ({ name }) => name === '_marshmallow_session',
        )?.value;
        if (!session) {
            console.warn('No session cookie found');
            return;
        }
        const cookie = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
        const id = await this.fetchId(omu, cookie);
        if (!id) return;
        return new MarshmallowSession(cookie, id.id, id.displayId);
    }

    public static async login(omu: Omu): Promise<MarshmallowSession | undefined> {
        const url = 'https://marshmallow-qa.com/';
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
            console.warn('No session cookie found');
            return;
        }
        const cookie = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
        const id = await this.fetchId(omu, cookie);
        if (!id) return;
        return new MarshmallowSession(cookie, id.id, id.displayId);
    }

    public getCookie(): string {
        return this.cookie;
    }
};

export class MarshmallowAPI {
    private constructor(
        public readonly fetch: (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>,
        public readonly session: MarshmallowSession,
        public readonly headers: Record<string, string>,
    ) {}

    public static new(omu: Omu, session: MarshmallowSession) {
        return new MarshmallowAPI(
            (input, init) => omu.http.fetch(input, init),
            session,
            { cookie: session.getCookie() },
        );
    }

    public async user(): Promise<User> {
        const premium = this.hasPremium();
        const resp = await this.fetch('https://marshmallow-qa.com/settings/profile', {
            'headers': this.headers,
            'body': null,
            'method': 'GET',
        });
        const text = await resp.text();
        const dom = parseDocument(text);
        const profileSettings = DOM.query(dom, {
            attrs: { id: 'profile-setting' },
        });
        if (!profileSettings) throw new Error('No profile settings found');
        const form = DOM.query(profileSettings, {
            name: 'form',
            attrs: { action: '/settings/profile' },
        });
        if (!form) throw new Error('No profile form found');
        const nicknameInput = DOM.query(form, {
            attrs: { id: 'user_nickname' },
        });
        if (!nicknameInput) throw new Error('No nickname found');
        const nickname = nicknameInput.attribs.value;
        const description = DOM.query(form, {
            attrs: { id: 'user_description' },
        });
        if (!description) throw new Error('No description found');
        const profilePicture = DOM.query(form, {
            name: 'picture',
        });
        if (!profilePicture) throw new Error('No profile picture found');
        const pictureSource = DOM.query(profilePicture, {
            name: 'source',
        });
        const image = pictureSource?.attribs.srcset;
        return {
            nickname,
            description: DomUtils.textContent(description),
            image,
            premium: await premium,
        };
    }

    private async hasPremium(): Promise<boolean | undefined> {
        const resp = await this.fetch('https://marshmallow-qa.com/settings/premium', {
            'headers': this.headers,
            'body': null,
            'method': 'GET',
        });
        const dom = parseDocument(await resp.text());
        const setting = DOM.query(dom, { attrs: { id: 'premium-subscription-setting' } });
        if (!setting) throw new Error('Premium setting not found');
        const hasCheckoutForm = DOM.query(setting, {
            name: 'form',
            attrs: { action: /\/stripe\/checkout\/sessions?price=/gm },
        });
        const hasWithdrawalButton = DOM.query(setting, { attrs: { 'data-bs-target': '#premium-withdrawal-confirmation' } });
        const hasPremium = hasWithdrawalButton && !hasCheckoutForm;
        return hasPremium;
    }

    private extractMessageIdFromPathname(pathname: string): string {
        const idRegex = /^\/messages\/(?<id>([\da-z]+-)*[\da-z]+)/gm;
        const match = idRegex.exec(pathname);
        if (!match || !match.groups || !match.groups.id) {
            throw new Error('No id found');
        }
        return match.groups.id;
    }

    private parseAnswerFragment(fragment: string): AnswerMessage {
        const dom = parseDocument(fragment);
        const root = DOM.query(dom, { name: 'li' });
        if (!root) throw new Error('No answer found');
        const updatedAt = DomUtils.getAttributeValue(root, 'data-updated-at');
        if (!updatedAt) throw new Error('No updated at found');
        const messageCard = DOM.query(root, {
            attrs: { 'data-obscene-word-raw-content-path-value': /^\/messages\/([\da-z]+-)*[\da-z]+\/raw/gm },
        });
        if (!messageCard) throw new Error('No answer content found');
        const message = DOM.query(messageCard, {
            attrs: { 'data-message-card-target': null },
        });
        if (!message) throw new Error('No message found');
        const content = DOM.query(messageCard, {
            attrs: { 'data-obscene-word-target': 'content' },
        });
        if (!content) throw new Error('No content found');
        const replyContainer = DOM.query(root, {
            attrs: { 'data-obscene-word-raw-content-path-value': /^\/messages\/([\da-z]+-)*[\da-z]+\/answers\/\d+\/raw/gm },
        });
        if (!replyContainer) throw new Error('No answer content found');
        const reply = DOM.query(replyContainer, {
            attrs: { 'data-obscene-word-target': 'content' },
        });
        if (!reply) throw new Error('No answer content found');
        const id = this.extractMessageIdFromPathname(DomUtils.getAttributeValue(messageCard, 'data-obscene-word-raw-content-path-value') ?? '');
        return {
            id,
            date: updatedAt,
            iso8601: new Date(updatedAt),
            content: DOM.serialize(content),
            reply: DOM.serialize(reply),
        };
    }

    public async answers(options: {
        before: Date;
    }) {
        const timestamp = options.before
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '');
        const resp = await this.fetch(`https://marshmallow-qa.com/users/${this.session.id}/answers?before=${timestamp}`, {
            headers: {
                ...this.headers,
                accept: 'application/json',
            },
            body: null,
            method: 'GET',
        });
        if (!resp.ok) {
            console.warn(`Failed to get answers by user ${this.session.id}: ${resp.status} ${resp.statusText}`);
            return [];
        }
        const data: {
            id: number;
            fragment: string;
        }[] = await resp.json();
        return data.map(({ id, fragment }) => {
            return {
                id,
                fragment: this.parseAnswerFragment(fragment),
            };
        });
    }

    private parseMessage(message: Element): Message | undefined {
        const root = DOM.query(message, {
            name: 'li',
            attrs: { id: null },
        });
        if (!root) throw new Error('No message found');
        if (!DomUtils.getAttributeValue(root, 'data-obscene-word-raw-content-path-value')) return;
        const id = this.extractMessageIdFromPathname(DomUtils.getAttributeValue(root, 'data-obscene-word-raw-content-path-value') ?? '');
        const content = DOM.query(root, {
            attrs: { 'data-obscene-word-target': 'content' },
        });
        if (!content) throw new Error('No content found');
        const date = DOM.query(root, {
            name: 'a',
            attrs: { href: /^\/messages\/(?:[\da-z]+-)*[\da-z]+$/gm },
        });
        return {
            id,
            date: date && DomUtils.textContent(date),
            content: DOM.serialize(content),
        };
    }

    public async messages(options: {
        page?: number;
        order?: 'desc' | 'recommended' | 'asc';
    }): Promise<Message[]> {
        const params = new URLSearchParams();
        if (options.page && options.page > 1) {
            params.set('page', options.page.toString());
        }
        params.set('order', options.order ?? 'desc');
        const resp = await this.fetch(`https://marshmallow-qa.com/messages?${params.toString()}`, {
            'headers': {
                ...this.headers,
                'accept': 'text/vnd.turbo-stream.html',
                'force-turbo-stream': 'true',
            },
            'body': null,
            'method': 'GET',
        });
        const text = await resp.text();
        const dom = parseDocument(text);
        const messages = DOM.queryAll(dom, {
            name: 'li',
            attrs: { 'data-obscene-word-raw-content-path-value': null },
        }).filter((element): element is Element => element.type === ElementType.Tag);
        return messages.map(element => this.parseMessage(element)).filter(message => !!message);
    }

    public async messageActions(options: {
        id: string;
    }): Promise<MessageAction[]> {
        const resp = await this.fetch(`https://marshmallow-qa.com/messages/${options.id}`, {
            'headers': this.headers,
            'body': null,
            'method': 'GET',
        });
        const text = await resp.text();
        const dom = parseDocument(text);
        const actions = DOM.queryAll(dom, {
            name: 'form',
        })
            .map(Form.actions)
            .flat()
            .filter((action) => {
                return action.action && action.messageId === options.id;
            });
        return actions;
    }

    public async messageRaw(options: {
        id: string;
    }): Promise<{ content: string }> {
        const resp = await this.fetch(`https://marshmallow-qa.com/messages/${options.id}/raw`, {
            'headers': this.headers,
            'body': null,
            'method': 'GET',
        });
        return await resp.json();
    }
}

export class MessageAction {
    constructor(
        public readonly messageId: string,
        public readonly action: string,
        public readonly params: string | undefined,
        private readonly method: string,
        public readonly options: ReadonlyMap<string, Element>,
    ) {}

    public static from(
        action: string,
        method: string,
        options: ReadonlyMap<string, Element>,
    ): MessageAction | undefined {
        const regex = /\/messages\/(?<id>(?:[\w]+-)*[\w]+)\/(?<action>(?:\w*\/)*\w*)(?:\?(?<params>.+))?/gm;
        const match = regex.exec(action);
        if (!match || !match.groups || !match.groups.id) {
            return;
        }
        return new MessageAction(match.groups.id, match.groups.action, match.groups.params, method, options);
    }

    private getValue(element: Element): string | undefined {
        if (element.name === 'input') {
            return element.attribs.value;
        } else if (element.name === 'select') {
            const option = DOM.query(element, {
                name: 'option',
                attrs: { selected: 'selected' },
            }) || DOM.query(element, {
                name: 'option',
            });
            return option?.attribs.value;
        } else if (element.name === 'textarea') {
            return DomUtils.textContent(element);
        }
        return undefined;
    }

    public async submit(api: MarshmallowAPI, extra: Record<string, string>): Promise<void> {
        const options: Record<string, string | undefined> = {};
        for (const [key, value] of this.options.entries()) {
            options[key] = this.getValue(value);
        }
        for (const [key, value] of Object.entries(extra)) {
            options[key] = value;
        }
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(options)) {
            if (value !== undefined) {
                body.append(key, value);
            }
        }
        const action = this.params ? `${this.action}?${this.params}` : this.action;
        const data = body.toString();
        const resp = await api.fetch(`https://marshmallow-qa.com/messages/${this.messageId}/${action}`, {
            'headers': {
                ...api.headers,
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            'body': data,
            'method': this.method,
        });
        if (!resp.ok) {
            throw new Error(`Failed to submit action: ${resp.status} ${resp.statusText}`);
        }
    }
}

class Form {
    public static actions(form: Element): MessageAction[] {
        if (form.name !== 'form') throw new Error('Not a form element');
        const action = form.attribs.action;
        const method = (form.attribs.method ?? 'GET').toUpperCase();
        const options: Map<string, Element> = DOM.queryAll(form, {
            name: ['input', 'select', 'textarea'],
            attrs: { name: null },
        }).reduce((acc, curr) => {
            const name = curr.attribs.name;
            if (name) acc.set(name, curr);
            return acc;
        }, new Map<string, Element>());
        const actions: (MessageAction | undefined)[] = [];
        if (action) {
            actions.push(MessageAction.from(action, method, options));
        }
        const buttons = DOM.queryAll(form, {
            name: 'button',
            attrs: { formaction: null },
        });
        for (const button of buttons) {
            actions.push(MessageAction.from(button.attribs['formaction'], method, options));
        }
        return actions.filter((action) => !!action);
    }
}
