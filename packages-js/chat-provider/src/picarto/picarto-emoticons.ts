import { HttpClient } from '@omujs/iwashi';

import type { ProviderHttp } from '../provider';

export type Emoticon = {
    a: string;
    u: string;
};

export class PicartoEmoticons {
    private static readonly MAIN_SCRIPT = /main.\w+.js/;
    private static readonly DATA_MODULE = /(?<id>\d+):\s?function\(.\)\s?{\s*(?:"use strict";)?\s*?\w\.exports\s?=\s?"(?<data>data:[^"]+)"/g;
    private static readonly DICTIONARY = /\[({(?:\s*\w+:\s*(?:"[^"]*"|\w\([^)]+\)),?)*\s*},?\s*)+\]/g;
    private static readonly ENTRY = /{[^{}]*}/g;
    private static readonly NAME = /name:"(?<name>[^"]+)"/;
    private static readonly MODULE = /emoticon:\w+\((?<module>\d+)\)/;

    private constructor(private readonly lookup: Map<string, Emoticon>) {}

    public static empty(): PicartoEmoticons {
        return new PicartoEmoticons(new Map());
    }

    public static async load(http: ProviderHttp): Promise<PicartoEmoticons> {
        const page = HttpClient.parse(await http.text('https://picarto.tv/'));
        const src = page.querySelectorAll('script')
            .map((script) => script.getAttribute('src'))
            .find((value) => value !== undefined && PicartoEmoticons.MAIN_SCRIPT.test(value));
        if (!src) throw new Error('Cannot get main.js from picarto.tv');
        return PicartoEmoticons.parse(await http.text(`https://picarto.tv${src}`));
    }

    public static parse(script: string): PicartoEmoticons {
        const modules = new Map<string, string>();
        for (const match of script.matchAll(PicartoEmoticons.DATA_MODULE)) {
            const { id, data } = match.groups ?? {};
            if (id && data) modules.set(id, data);
        }
        const lookup = new Map<string, Emoticon>();
        for (const dictionary of script.match(PicartoEmoticons.DICTIONARY) ?? []) {
            for (const [entry] of dictionary.matchAll(PicartoEmoticons.ENTRY)) {
                const name = PicartoEmoticons.NAME.exec(entry)?.groups?.name;
                const module = PicartoEmoticons.MODULE.exec(entry)?.groups?.module;
                if (!module) continue;
                const data = modules.get(module);
                if (!data) continue;
                const alias = `ptv-${name}`;
                lookup.set(alias, { a: alias, u: data });
            }
        }
        return new PicartoEmoticons(lookup);
    }

    public get(alias: string): Emoticon | undefined {
        return this.lookup.get(alias);
    }

    public addAll(emoticons: readonly Emoticon[]): void {
        for (const emoticon of emoticons) {
            this.lookup.set(emoticon.a, emoticon);
        }
    }
}
