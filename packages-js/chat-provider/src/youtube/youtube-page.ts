import { HttpClient } from '@omujs/iwashi';
import type { HTMLElement } from 'node-html-parser';

export type Json = { [key: string]: Json } | Json[] | string | number | boolean | null;

export class JsonPath {
    public constructor(public readonly value: Json | undefined) {}

    public get(...keys: (string | number)[]): JsonPath {
        let value: Json | undefined = this.value;
        for (const key of keys) {
            if (value === null || value === undefined || typeof value !== 'object') return new JsonPath(undefined);
            value = (value as Record<string | number, Json>)[key];
        }
        return new JsonPath(value);
    }

    public list(): JsonPath[] {
        return Array.isArray(this.value) ? this.value.map((item) => new JsonPath(item)) : [];
    }

    public string(): string | undefined {
        return typeof this.value === 'string' ? this.value : undefined;
    }

    public has(): boolean {
        return this.value !== undefined && this.value !== null;
    }

    public object(): Record<string, Json> | undefined {
        if (this.value === null || typeof this.value !== 'object' || Array.isArray(this.value)) return;
        return this.value;
    }
}

export class YoutubePage {
    private constructor(private readonly page: HTMLElement) {}

    public static parse(html: string): YoutubePage {
        return new YoutubePage(HttpClient.parse(html));
    }

    public get apiKey(): string {
        const key = this.script('ytcfg.set')?.get('INNERTUBE_API_KEY').string();
        if (!key) throw new TypeError('Could not find ytcfg data');
        return key;
    }

    public initialData(): JsonPath | undefined {
        return this.script('var ytInitialData =') ?? this.script('window["ytInitialData"]');
    }

    public playerResponse(): JsonPath {
        const response = this.script('var ytInitialPlayerResponse');
        if (!response) throw new TypeError('Could not find initial player response');
        return response;
    }

    public selectAttribute(selector: string, attribute: string): string | undefined {
        return this.page.querySelector(selector)?.getAttribute(attribute);
    }

    private script(prefix: string): JsonPath | undefined {
        const text = this.page.querySelectorAll('script')
            .map((script) => script.text.trim())
            .find((script) => script.startsWith(prefix));
        if (!text || !text.includes('{') || !text.includes('}')) return;
        return new JsonPath(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
    }
}

export class YoutubeContinuation {
    private static readonly KINDS = ['invalidationContinuationData', 'timedContinuationData', 'reloadContinuationData'];

    public static fromChatPage(page: YoutubePage): string | undefined {
        return YoutubeContinuation.first(page.initialData()?.get('contents', 'liveChatRenderer', 'continuations') ?? new JsonPath(undefined));
    }

    public static first(continuations: JsonPath): string | undefined {
        for (const continuation of continuations.list()) {
            for (const kind of YoutubeContinuation.KINDS) {
                const value = continuation.get(kind, 'continuation').string();
                if (value) return value;
            }
        }
        return;
    }
}
