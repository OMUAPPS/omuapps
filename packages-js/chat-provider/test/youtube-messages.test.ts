import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Models } from '@omujs/chat';

import { type Json, JsonPath, YoutubeMessageParser, YoutubeProvider } from '../src';

type Reference = {
    actions: Json[];
    messages: (Record<string, unknown> & { created_at_ms: number })[];
    authors: Record<string, unknown>[];
};

const REFERENCE: Reference = JSON.parse(readFileSync(path.join(import.meta.dir, 'fixtures', 'youtube-messages.json'), 'utf-8'));

class Normalized {
    public static of(value: unknown): unknown {
        if (value === null || value === undefined) return undefined;
        if (Array.isArray(value)) return value.map((item) => Normalized.of(item));
        if (typeof value !== 'object') return value;
        return Object.fromEntries(Object.entries(value)
            .map(([key, item]) => [key, Normalized.of(item)] as const)
            .filter(([, item]) => item !== undefined));
    }
}

describe('YoutubeMessageParser', () => {
    const parser = new YoutubeMessageParser(
        YoutubeProvider.PROVIDER.id,
        YoutubeProvider.PROVIDER.id.join('video'),
        { knownName: () => undefined },
    );
    const parsed = REFERENCE.actions
        .map((action) => parser.parse(new JsonPath(action).get('addChatItemAction', 'item')))
        .filter((item) => item !== undefined);

    test('parses the same number of messages as Python', () => {
        expect(parsed.length).toBe(REFERENCE.messages.length);
    });

    REFERENCE.messages.forEach((expected, index) => {
        test(`message ${expected.id} matches Python`, () => {
            const { message } = parsed[index];
            const { created_at_ms: createdAt, ...fields } = expected;
            const actual = Models.Message.serialize(message) as Record<string, unknown>;
            delete actual.created_at;
            expect(Normalized.of(actual)).toEqual(Normalized.of(fields));
            expect(message.createdAt.getTime()).toBe(createdAt);
        });
    });

    REFERENCE.authors.forEach((expected, index) => {
        test(`author ${expected.id} matches Python`, () => {
            expect(Normalized.of(Models.Author.serialize(parsed[index].author))).toEqual(Normalized.of(expected));
        });
    });
});
