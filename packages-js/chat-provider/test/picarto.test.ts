import { describe, expect, test } from 'bun:test';

import { Models } from '@omujs/chat';

import { PicartoEmoticons, PicartoMessageParser, PicartoProvider } from '../src';

class PicartoFixture {
    public static readonly channel: Models.Channel = new Models.Channel({
        providerId: PicartoProvider.PROVIDER.id,
        id: PicartoProvider.PROVIDER.id.join('artist'),
        url: 'https://picarto.tv/artist',
        name: 'artist',
        description: '',
        active: true,
        iconUrl: '',
    });

    public static readonly room: Models.Room = new Models.Room({
        id: PicartoFixture.channel.id,
        providerId: PicartoProvider.PROVIDER.id,
        connected: true,
        status: 'online',
        metadata: {},
        channelId: PicartoFixture.channel.id.key(),
        createdAt: new Date(0),
    });

    public static parser(emoticons: PicartoEmoticons = PicartoEmoticons.empty()): PicartoMessageParser {
        return new PicartoMessageParser(PicartoProvider.PROVIDER, PicartoFixture.channel, PicartoFixture.room, emoticons);
    }
}

describe('PicartoMessageParser', () => {
    test('keeps the text before and after an emoticon', () => {
        const parser = PicartoFixture.parser();
        const content = parser.content({ m: 'hello :wave: world', e: [{ a: 'wave', u: 'emotes/wave.png' }] });
        expect(content.data).toEqual([
            { type: 'text', data: 'hello ' },
            { type: 'image', data: { id: 'wave', name: 'wave', url: 'https://images.picarto.tv/emotes/wave.png' } },
            { type: 'text', data: ' world' },
        ]);
    });

    test('leaves unknown aliases as text', () => {
        const content = PicartoFixture.parser().content({ m: 'a :unknown: b' });
        expect(content.data).toEqual([
            { type: 'text', data: 'a ' },
            { type: 'text', data: ':unknown:' },
            { type: 'text', data: ' b' },
        ]);
    });

    test('builds the author from the message', () => {
        const { message, author } = PicartoFixture.parser().message({
            id: 42,
            u: 7,
            n: 'viewer',
            i: 'avatars/7.png',
            cb: { c: 3, i: 'badges/3.png' },
            m: 'hi',
            d: 1_700_000_000_000,
        });
        expect(message.id.key()).toBe('com.omuapps:chatprovider/picarto/artist/42');
        expect(message.createdAt.getTime()).toBe(1_700_000_000_000);
        expect(author?.id.key()).toBe('com.omuapps:chatprovider/picarto/artist/7');
        expect(author?.metadata.url).toBe('https://picarto.tv/viewer');
        expect(author?.roles?.[0].iconUrl).toBe('https://images.picarto.tv/badges/3.png');
    });
});

describe('PicartoEmoticons', () => {
    test('reads emoticons embedded in the main script', () => {
        const script = [
            '12:function(e){"use strict";e.exports="data:image/png;base64,AAAA"}',
            '[{name:"smile",filename:"smile.png",emoticon:n(12)},{name:"missing",emoticon:n(99)}]',
        ].join(',');
        const emoticons = PicartoEmoticons.parse(script);
        expect(emoticons.get('ptv-smile')).toEqual({ a: 'ptv-smile', u: 'data:image/png;base64,AAAA' });
        expect(emoticons.get('ptv-missing')).toBeUndefined();
    });
});

describe('PicartoProvider', () => {
    test('matches channel urls with its pattern', () => {
        const pattern = new RegExp(PicartoProvider.PROVIDER.regex);
        expect(pattern.exec('https://picarto.tv/artist')?.groups?.id).toBe('artist');
    });
});
