import { createHash } from 'node:crypto';

import type { HTMLElement } from 'node-html-parser';

import { HttpClient, PatternVisitor, type SiteProfile } from '../crawl';

type Endpoint = {
    queryId: string;
    operationName: string;
    operationType: string;
    metadata: { featureSwitches: string[] };
};

type ExportValue = string | unknown[] | ExportObject;
type ExportObject = { [key: string]: ExportValue };

type UserResponse = {
    data?: {
        user: {
            result: {
                __typename: string;
                legacy: {
                    name: string;
                    description: string;
                    profile_image_url_https: string;
                    entities: {
                        url?: { urls: { expanded_url: string }[] };
                        description: { urls: { expanded_url: string }[] };
                    };
                };
            };
        };
    };
};

class PythonMath {
    public static round(value: number): number {
        const floor = Math.floor(value);
        const difference = value - floor;
        if (difference > 0.5) return floor + 1;
        if (difference < 0.5) return floor;
        return floor % 2 === 0 ? floor : floor + 1;
    }

    public static roundTo(value: number, digits: number): number {
        const scale = 10 ** digits;
        return PythonMath.round(value * scale) / scale;
    }
}

export class TransactionAnimation {
    public static key(frameRow: number[], targetTime: number): string {
        const fromColor = [...frameRow.slice(0, 3), 1];
        const toColor = [...frameRow.slice(3, 6), 1];
        const toRotation = [TransactionAnimation.solve(frameRow[6], 60, 360, true)];
        const curves = frameRow.slice(7).map((item, counter) => TransactionAnimation.solve(item, counter % 2 ? -1 : 0, 1, false));
        const value = TransactionAnimation.cubicCurve(curves, targetTime);
        const color = TransactionAnimation.interpolate(fromColor, toColor, value).map((item) => (item > 0 ? item : 0));
        const [rotation] = TransactionAnimation.interpolate([0], toRotation, value);
        const radians = (rotation * Math.PI) / 180;
        const matrix = [Math.cos(radians), -Math.sin(radians), Math.sin(radians), Math.cos(radians)];
        const parts = [
            ...color.slice(0, -1).map((item) => PythonMath.round(item).toString(16)),
            ...matrix.map((item) => `0${Math.trunc(Math.abs(PythonMath.round(item * 100) / 100)).toString(16)}`),
            '0',
            '0',
        ];
        return parts.join('').replaceAll('.', '').replaceAll('-', '');
    }

    private static solve(value: number, min: number, max: number, rounding: boolean): number {
        const result = (value * (max - min)) / 255 + min;
        return rounding ? Math.trunc(result) : PythonMath.roundTo(result, 2);
    }

    private static bezier(a: number, b: number, m: number): number {
        return 3 * a * (1 - m) * (1 - m) * m + 3 * b * (1 - m) * m * m + m * m * m;
    }

    private static cubicCurve(curves: number[], time: number): number {
        if (time <= 0) {
            let gradient = 0;
            if (curves[0] > 0) gradient = curves[1] / curves[0];
            else if (curves[1] === 0 && curves[2] > 0) gradient = curves[3] / curves[2];
            return gradient * time;
        }
        if (time >= 1) {
            let gradient = 0;
            if (curves[2] < 1) gradient = (curves[3] - 1) / (curves[2] - 1);
            else if (curves[2] === 1 && curves[0] < 1) gradient = (curves[1] - 1) / (curves[0] - 1);
            return 1 + gradient * (time - 1);
        }
        let start = 0;
        let end = 1;
        let mid = 0;
        while (start < end) {
            mid = (start + end) / 2;
            const estimate = TransactionAnimation.bezier(curves[0], curves[2], mid);
            if (Math.abs(time - estimate) < 0.00001) return TransactionAnimation.bezier(curves[1], curves[3], mid);
            if (estimate < time) start = mid;
            else end = mid;
        }
        return TransactionAnimation.bezier(curves[1], curves[3], mid);
    }

    private static interpolate(from: number[], to: number[], f: number): number[] {
        if (from.length !== to.length) throw new Error(`Mismatched interpolation arguments ${from}: ${to}`);
        return from.map((value, index) => value * (1 - f) + to[index] * f);
    }
}

export class XVisitor extends PatternVisitor {
    private static readonly SCRIPTS_LOADED = /^window\.__SCRIPTS_LOADED__\s*=\s*{\s*};?/;
    private static readonly SCRIPTS_MAP = /{\s*["'][a-zA-Z0-9-_\s/\\.~]*["']\s*:\s*["'][a-zA-Z0-9-_\s/\\.~]*["'](?:\s*,\s*\s*["'][a-zA-Z0-9-_\s/\\.~]*["']\s*:\s*["'][a-zA-Z0-9-_\s/\\.~]*["'])*\s*}/g;
    private static readonly EXPORT_OBJECT = /^{[a-zA-Z][a-zA-Z0-9]*\s*:\s*(?:["']|\[|{).+}$/;
    private static readonly INDICES = /\(\w{1}\[(?<indice>\d{1,2})\],\s*16\)/g;
    private static readonly BEARER = /(AAAAA.*?)"/;

    private readonly headers: Record<string, string> = {
        'accept': '*/*',
        'accept-language': 'ja',
        'User-Agent': HttpClient.BROWSER_USER_AGENT,
    };

    private endpoints = new Map<string, Endpoint>();
    private page: HTMLElement | undefined;
    private scripts: Record<string, string> | undefined;
    private mainScript: string | undefined;

    public constructor() {
        super('X', String.raw`(twitter|x)\.com/(#!/)?@?(?<id>\w+)`);
    }

    public async visit(id: string, http: HttpClient): Promise<SiteProfile | undefined> {
        const url = `https://x.com/${id}`;
        await this.setupHeaders(http);
        await this.retrieveEndpoints(http);
        const endpoint = this.endpoints.get('UserByScreenName');
        if (!endpoint) throw new Error('[X] Could not find UserByScreenName');
        const info = await this.call<UserResponse>(http, endpoint, { screen_name: id }, { withAuxiliaryUserLabels: false });
        if (!info.data) {
            console.warn(`[X] Could not find data for ${url}`);
            return;
        }
        const { result } = info.data.user;
        if (result.__typename === 'UserUnavailable') {
            return { site: this.name, id, url, name: '<UserUnavailable>', links: [] };
        }
        const data = result.legacy;
        const links = data.entities.url
            ? [...data.entities.url.urls, ...data.entities.description.urls].map((link) => link.expanded_url)
            : [];
        return {
            site: this.name,
            id,
            url,
            name: data.name,
            description: data.description,
            profilePicture: data.profile_image_url_https,
            links,
        };
    }

    private async fetchPage(http: HttpClient): Promise<HTMLElement> {
        this.page ??= await http.html('https://x.com/?mx=2', { headers: { 'User-Agent': HttpClient.BROWSER_USER_AGENT } });
        return this.page;
    }

    private async fetchMainScript(http: HttpClient): Promise<string> {
        if (this.mainScript) return this.mainScript;
        const element = (await this.fetchPage(http)).querySelector('script[src^="https://abs.twimg.com/responsive-web/client-web/main."]');
        const src = element?.getAttribute('src');
        if (!src) throw new Error('[X] Could not find main script');
        this.mainScript = await http.text(src, { headers: this.headers });
        return this.mainScript;
    }

    private async fetchScripts(http: HttpClient): Promise<Record<string, string>> {
        if (this.scripts) return this.scripts;
        const script = (await this.fetchPage(http)).querySelectorAll('script')
            .map((element) => element.text)
            .find((text) => XVisitor.SCRIPTS_LOADED.test(text));
        if (!script) throw new Error('[X] Could not find scripts');
        for (const map of script.match(XVisitor.SCRIPTS_MAP) ?? []) {
            let parsed: Record<string, string>;
            try {
                parsed = JSON.parse(map);
            } catch {
                console.warn(`[X] Could not parse script map: ${map}`);
                continue;
            }
            if (!('ondemand.s' in parsed)) continue;
            this.scripts = parsed;
            return parsed;
        }
        throw new Error('[X] Could not find required scripts');
    }

    private async fetchScript(http: HttpClient, name: string): Promise<string> {
        const key = (await this.fetchScripts(http))[name];
        if (!key) throw new Error(`[X] Could not find script: ${name}`);
        return http.text(`https://abs.twimg.com/responsive-web/client-web/${name}.${key}a.js`, { headers: this.headers });
    }

    private async retrieveEndpoints(http: HttpClient): Promise<void> {
        const endpoints = XVisitor.findExports(await this.fetchMainScript(http))
            .filter((text) => XVisitor.EXPORT_OBJECT.test(text))
            .map((text) => XVisitor.parseExport(text))
            .filter((value): value is ExportObject & Endpoint => 'queryId' in value && 'operationName' in value && 'operationType' in value && 'metadata' in value);
        this.endpoints = new Map(endpoints.map((endpoint) => [endpoint.operationName, endpoint]));
    }

    private async setupHeaders(http: HttpClient): Promise<void> {
        if (!this.headers.authorization) {
            const match = XVisitor.BEARER.exec(await this.fetchMainScript(http));
            if (!match) throw new Error('[X] Could not find bearer token');
            this.headers.authorization = `Bearer ${match[1]}`;
        }
        if (!this.headers['x-guest-token']) {
            const { guest_token: token } = await http.json<{ guest_token: string }>('https://api.x.com/1.1/guest/activate.json', {
                method: 'POST',
                headers: this.headers,
            });
            this.headers['x-guest-token'] = token;
        }
    }

    private async call<T>(http: HttpClient, endpoint: Endpoint, variables: object, fieldToggles: object): Promise<T> {
        const path = `/i/api/graphql/${endpoint.queryId}/${endpoint.operationName}`;
        const transactionId = await this.transactionId(http, 'GET', path);
        return http.json<T>(`https://x.com${path}`, {
            params: {
                variables: JSON.stringify(variables),
                features: JSON.stringify(Object.fromEntries(endpoint.metadata.featureSwitches.map((key) => [key, true]))),
                fieldToggles: JSON.stringify(fieldToggles),
            },
            headers: { ...this.headers, 'x-client-transaction-id': transactionId },
        });
    }

    private async transactionId(http: HttpClient, method: string, path: string): Promise<string> {
        const timeNow = Math.trunc(Date.now() - 1682924400);
        const timeBytes = [0, 1, 2, 3].map((index) => Number((BigInt(timeNow) >> BigInt(index * 8)) & 0xFFn));
        const verification = (await this.fetchPage(http)).querySelector('[name="twitter-site-verification"]')?.getAttribute('content');
        if (!verification) throw new Error('[X] Could not find twitter-site-verification');
        const keyBytes = [...Buffer.from(verification, 'base64')];
        const animationKey = await this.animationKey(http, keyBytes);
        const hash = [...createHash('sha256').update(`${method}!${path}!${timeNow}!${animationKey}`).digest()];
        const random = Math.floor(Math.random() * 256);
        const bytes = [...keyBytes, ...timeBytes, ...hash.slice(0, 16), random, 3];
        return Buffer.from([random, ...bytes.map((item) => item ^ random)]).toString('base64').replaceAll('=', '');
    }

    private async animationKey(http: HttpClient, keyBytes: number[]): Promise<string> {
        const indices = [...(await this.fetchScript(http, 'ondemand.s')).matchAll(XVisitor.INDICES)].map((match) => Number(match.groups?.indice));
        const frameTime = indices.reduce((product, index) => product * (keyBytes[index] % 16), 1);
        const frames = (await this.fetchPage(http)).querySelectorAll('[id^="loading-x-anim"]');
        const path = frames[keyBytes[5] % 4].querySelectorAll('path')[1].getAttribute('d') ?? '';
        const rows = path.slice(9).split('C').map((item) => item.replace(/[^\d]+/g, ' ').trim().split(' ').map(Number));
        return TransactionAnimation.key(rows[keyBytes[0] % 16], frameTime / 4096);
    }

    private static findExports(script: string): string[] {
        const exports: string[] = [];
        let index = 0;
        while (index < script.length) {
            index = script.indexOf('e.exports', index);
            if (index === -1) break;
            index += 'e.exports'.length;
            let open = script.indexOf('{', index);
            let close = script.indexOf('}', index);
            if (open === -1 || close === -1) break;
            if (close < open) continue;
            const start = open;
            index = open + 1;
            let depth = 1;
            while (index < script.length) {
                open = script.indexOf('{', index);
                close = script.indexOf('}', index);
                if (open === -1 || close === -1) break;
                if (open < close) {
                    depth += 1;
                    index = open + 1;
                } else {
                    depth -= 1;
                    index = close + 1;
                }
                if (depth <= 0) {
                    exports.push(script.slice(start, index));
                    break;
                }
            }
        }
        return exports;
    }

    private static parseExport(text: string): ExportObject {
        const result: ExportObject = {};
        let index = 0;
        while (index < text.length) {
            const match = /([a-zA-Z][a-zA-Z0-9]*)\s*:/.exec(text.slice(index));
            if (!match) break;
            index += match.index + match[0].length;
            const head = text[index];
            if (head === '[') {
                const end = text.indexOf(']', index);
                result[match[1]] = JSON.parse(text.slice(index, end + 1));
                index = end + 1;
            } else if (head === '{') {
                const end = text.indexOf('}', index);
                result[match[1]] = XVisitor.parseExport(text.slice(index, end + 1));
                index = end + 1;
            } else if (head === '\'' || head === '"') {
                const end = text.indexOf(head, index + 1);
                result[match[1]] = text.slice(index + 1, end);
                index = end + 1;
            } else {
                throw new Error(`Unexpected value: ${text.slice(index)}`);
            }
        }
        return result;
    }
}
