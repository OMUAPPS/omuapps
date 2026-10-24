import { describe, expect, test } from 'bun:test';

import { IrcCommand, TwitchMessages, TwitchProvider } from '../src/twitch';

describe('IrcCommand', () => {
    test('parses tags, sender and text containing " :"', () => {
        const line = '@badge-info=;emotes=25:0-4;id=abc;room-id=123;tmi-sent-ts=1700000000000;user-id=42 :foo!foo@foo.tmi.twitch.tv PRIVMSG #bar :Kappa hello :D world';
        const packet = IrcCommand.parse(line).packet();
        expect(packet?.action).toBe('PRIVMSG');
        expect(packet?.sender).toBe('foo!foo@foo.tmi.twitch.tv');
        expect(packet?.params.emotes).toBe('25:0-4');
        expect(packet?.params['badge-info']).toBe('');
        expect(packet?.text).toBe('Kappa hello :D world');
    });

    test('keeps "=" inside tag values', () => {
        const packet = IrcCommand.parse('@msg=a=b :tmi.twitch.tv NOTICE #x :hi').packet();
        expect(packet?.params.msg).toBe('a=b');
    });

    test('parses PING without sender', () => {
        const packet = IrcCommand.parse('PING :tmi.twitch.tv').packet();
        expect(packet?.action).toBe('PING');
        expect(packet?.sender).toBe('');
    });

    test('formats commands', () => {
        expect(IrcCommand.cap('twitch.tv/tags', 'twitch.tv/commands').format()).toBe('CAP REQ :twitch.tv/tags twitch.tv/commands');
        expect(IrcCommand.user('justinfan').format()).toBe('USER justinfan 8 * :justinfan');
        expect(IrcCommand.join('bar').format()).toBe('JOIN #bar');
    });
});

describe('TwitchMessages', () => {
    test('splits text and emotes', () => {
        const content = TwitchMessages.parse('Kappa hi Kappa', '25:0-4,9-13');
        expect(content.data).toEqual([
            { type: 'image', data: { url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0', id: 'Kappa' } },
            { type: 'text', data: ' hi ' },
            { type: 'image', data: { url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0', id: 'Kappa' } },
        ]);
    });

    test('counts positions by code point', () => {
        const content = TwitchMessages.parse('😀 Kappa!', '25:2-6');
        expect(content.data).toEqual([
            { type: 'text', data: '😀 ' },
            { type: 'image', data: { url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0', id: 'Kappa' } },
            { type: 'text', data: '!' },
        ]);
    });

    test('returns text only without emotes', () => {
        expect(TwitchMessages.parse('hello').data).toEqual([{ type: 'text', data: 'hello' }]);
    });
});

describe('TwitchProvider', () => {
    test('matches channel urls', () => {
        const regex = new RegExp(TwitchProvider.PROVIDER.regex);
        expect(regex.exec('https://www.twitch.tv/some_user')?.groups?.id).toBe('some_user');
        expect(regex.exec('https://youtube.com/@x')).toBeNull();
    });
});
