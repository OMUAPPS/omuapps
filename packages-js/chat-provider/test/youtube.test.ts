import { describe, expect, test } from 'bun:test';

import { Models } from '@omujs/chat';
import { Throttle } from '@omujs/iwashi';
import { Identifier } from '@omujs/omu';

import {
    type ChatData,
    type ChatSource,
    ProviderTemporarilyUnavailable,
    type TransportResponse,
    YoutubeApi,
    YoutubeChatApi,
    YoutubeProvider,
    YoutubeRoom,
    type YoutubeTransport,
} from '../src';

const KINDS = ['invalidationContinuationData', 'timedContinuationData', 'reloadContinuationData'];

class FakeResponse implements TransportResponse {
    public constructor(
        private readonly data: unknown = undefined,
        private readonly body = '',
        public readonly status = 200,
    ) {}

    public async text(): Promise<string> {
        return this.body;
    }

    public async json(): Promise<unknown> {
        if (this.data instanceof Error) throw this.data;
        return this.data;
    }
}

type Reply = FakeResponse | Error;

class FakeSession implements YoutubeTransport {
    public chatPage: Reply;
    public watchPage: Reply;
    public posts: Reply[];
    public watchCount = 0;

    public constructor(options: { kind?: string | null; posts?: Reply[]; details?: Record<string, unknown> } = {}) {
        const kind = options.kind === undefined ? KINDS[0] : options.kind;
        const initial = { contents: { liveChatRenderer: { continuations: kind ? [{ [kind]: { continuation: 'secret-token' } }] : [] } } };
        this.chatPage = new FakeResponse(undefined,
            '<script>ytcfg.set({"INNERTUBE_API_KEY":"secret-key"});</script>'
            + `<script>var ytInitialData = ${JSON.stringify(initial)};</script>`);
        const player = { microformat: { playerMicroformatRenderer: { liveBroadcastDetails: options.details ?? {} } } };
        this.watchPage = new FakeResponse(undefined, `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>`);
        this.posts = options.posts ?? [new FakeResponse(YoutubeFixture.chatData(kind ?? KINDS[0]))];
    }

    public async get(url: string): Promise<TransportResponse> {
        if (url.endsWith('/watch')) {
            this.watchCount += 1;
            return FakeSession.reply(this.watchPage);
        }
        return FakeSession.reply(this.chatPage);
    }

    public async post(): Promise<TransportResponse> {
        const reply = this.posts.length > 1 ? this.posts.shift() : this.posts[0];
        return FakeSession.reply(reply ?? new FakeResponse({}));
    }

    private static reply(reply: Reply): TransportResponse {
        if (reply instanceof Error) throw reply;
        return reply;
    }
}

class YoutubeFixture {
    public static chatData(kind = KINDS[0]): object {
        return { continuationContents: { liveChatContinuation: { continuations: [{ [kind]: { continuation: 'secret-token' } }], actions: [] } } };
    }

    public static api(session: FakeSession): YoutubeApi {
        return new YoutubeApi(session, new Throttle(0));
    }

    public static async chat(session: FakeSession, sleeps: number[] = []): Promise<YoutubeChatApi> {
        return YoutubeChatApi.fromVideoId(YoutubeFixture.api(session), 'video', async (ms) => {
            sleeps.push(ms);
        });
    }
}

describe('YoutubeApi transient failures', () => {
    test.each(KINDS)('works with the %p continuation format for connect, reset, fetch and online', async (kind) => {
        const session = new FakeSession({ kind });
        const chat = await YoutubeFixture.chat(session);
        expect(await chat.resetContinuation()).toBe(true);
        expect(await chat.isOnline()).toBe(true);
        expect(await chat.next()).toBeDefined();
        expect(chat.chatContinuation).toBe('secret-token');
        expect(session.watchCount).toBe(0);
    });

    test.each([
        ['HTTP 503', new FakeResponse(undefined, '', 503)],
        ['API error', new FakeResponse({ error: { code: 503, message: 'secret-token' } })],
        ['timeout', new DOMException('secret-token', 'TimeoutError')],
        ['connection error', new TypeError('secret-token')],
        ['invalid JSON', new FakeResponse(new SyntaxError('secret-token'))],
        ['empty object', new FakeResponse({})],
        ['array', new FakeResponse([])],
        ['null contents', new FakeResponse({ continuationContents: null })],
    ])('treats %p as unknown without exposing secrets', async (_, response) => {
        const api = YoutubeFixture.api(new FakeSession({ posts: [response] }));
        const error = await api.isOnline('video').catch((caught) => caught);
        expect(error).toBeInstanceOf(ProviderTemporarilyUnavailable);
        expect(String(error.message)).not.toContain('secret-token');
        expect(String(error.message)).not.toContain('secret-key');
    });

    test.each([
        ['HTTP 503', new FakeResponse(undefined, '', 503)],
        ['timeout', new DOMException('timeout', 'TimeoutError')],
        ['not a page', new FakeResponse(undefined, 'not a page')],
    ])('does not treat a chat page failure (%p) as offline', async (_, page) => {
        const session = new FakeSession();
        session.chatPage = page;
        expect(YoutubeFixture.api(session).isOnline('video')).rejects.toBeInstanceOf(ProviderTemporarilyUnavailable);
    });

    test.each([{}, { isLiveNow: false }, { endTimestamp: 'invalid' }])('keeps a missing continuation with unconfirmed end (%p) unknown', async (details) => {
        expect(YoutubeFixture.api(new FakeSession({ kind: null, details })).isOnline('video')).rejects.toBeInstanceOf(ProviderTemporarilyUnavailable);
    });

    test('stops the online check and fetch after a confirmed end', async () => {
        const session = new FakeSession({ details: { endTimestamp: '2026-10-19T14:02:46+00:00' }, posts: [new FakeResponse({})] });
        const chat = await YoutubeFixture.chat(session);
        expect(await YoutubeFixture.api(session).isOnline('video')).toBe(false);
        expect(await chat.next()).toBeUndefined();
    });

    test('keeps a failed end confirmation unknown', async () => {
        const session = new FakeSession({ kind: null });
        session.watchPage = new FakeResponse(undefined, '', 503);
        expect(YoutubeFixture.api(session).isOnline('video')).rejects.toBeInstanceOf(ProviderTemporarilyUnavailable);
    });

    test.each([
        {},
        { continuationContents: { liveChatContinuation: {} } },
        { ...YoutubeFixture.chatData(), frameworkUpdates: [] },
        { ...YoutubeFixture.chatData(), frameworkUpdates: { entityBatchUpdate: { mutations: 'invalid' } } },
    ])('retries an unrecognized fetch response (%p) instead of closing', async (payload) => {
        const session = new FakeSession({ posts: [new FakeResponse(payload), new FakeResponse(YoutubeFixture.chatData())] });
        const chat = await YoutubeFixture.chat(session);
        expect(await chat.next()).toBeDefined();
    });

    test('recovers a fetch and does not signal the end after exhausting retries', async () => {
        const session = new FakeSession({ posts: [new FakeResponse(undefined, '', 503), new FakeResponse(YoutubeFixture.chatData())] });
        const sleeps: number[] = [];
        const chat = await YoutubeFixture.chat(session, sleeps);
        expect(await chat.next()).toBeDefined();
        expect(sleeps).toEqual([10_000]);
        session.posts = [new FakeResponse({})];
        expect(chat.next()).rejects.toBeInstanceOf(ProviderTemporarilyUnavailable);
        await Bun.sleep(10);
        session.posts = [new FakeResponse(YoutubeFixture.chatData())];
        expect(await chat.next()).toBeDefined();
    });
});

class FakeRooms {
    public updates = 0;
    public async update(): Promise<void> {
        this.updates += 1;
    }
}

class FakeSource implements ChatSource {
    public readonly videoId = 'video';
    public calls = 0;

    public constructor(
        private readonly results: (() => Promise<ChatData | undefined>)[],
        private readonly metadata: () => Promise<Models.Room['metadata']> = async () => ({}),
    ) {}

    public next(): Promise<ChatData | undefined> {
        const result = this.results[Math.min(this.calls, this.results.length - 1)];
        this.calls += 1;
        return result();
    }

    public fetchMetadata(): Promise<Models.Room['metadata']> {
        return this.metadata();
    }
}

class RoomFixture {
    public static create(source: FakeSource, options: { process?: () => Promise<void>; finalTimes?: () => Promise<void>; sleep?: (ms: number) => Promise<void> } = {}) {
        const rooms = new FakeRooms();
        const chat = { rooms, authors: { cache: new Map() } } as never;
        const room = new Models.Room({
            id: YoutubeProvider.PROVIDER.id.join('video'),
            providerId: YoutubeProvider.PROVIDER.id,
            connected: true,
            status: 'online',
            metadata: {},
            createdAt: new Date(),
        });
        const instance = new YoutubeRoom(
            chat,
            room,
            undefined,
            source,
            { update: options.finalTimes ?? (async () => {}) },
            { complete: async () => {} },
            options.sleep ?? (async () => {}),
        );
        instance.process = options.process ?? (async () => {});
        return { instance, rooms, room };
    }
}

describe('YoutubeRoom', () => {
    test('recovers after exhaustion and a metadata failure', async () => {
        const source = new FakeSource([
            async () => {
                throw new ProviderTemporarilyUnavailable('503');
            },
            async () => ({ actions: [], mutations: [] }),
            async () => undefined,
        ], async () => {
            throw new TypeError('invalid metadata');
        });
        let processed = 0;
        const { instance } = RoomFixture.create(source, { process: async () => {
            processed += 1;
        } });
        await instance.run();
        expect(processed).toBe(1);
        expect(source.calls).toBe(3);
        expect(instance.closed).toBe(true);
    });

    test.each(['retry_wait', 'fetch'])('stop ends a run that is waiting in %p', async (phase) => {
        const waiting = Promise.withResolvers<void>();
        const hang = () => {
            waiting.resolve();
            return new Promise<never>(() => {});
        };
        const source = new FakeSource([phase === 'retry_wait'
            ? async () => {
                throw new ProviderTemporarilyUnavailable('503');
            }
            : hang]);
        const { instance, rooms, room } = RoomFixture.create(source, {
            sleep: phase === 'retry_wait' ? hang : async () => {},
            finalTimes: async () => {
                throw new ProviderTemporarilyUnavailable('503');
            },
        });
        const run = instance.run();
        await waiting.promise;
        await instance.stop();
        await run;
        expect(room.connected).toBe(false);
        expect(room.status).toBe('offline');
        expect(rooms.updates).toBeGreaterThan(0);
    });

    test('does not retry a programming error in message processing', async () => {
        const source = new FakeSource([async () => ({ actions: [], mutations: [] })]);
        const { instance } = RoomFixture.create(source, { process: async () => {
            throw new Error('bug');
        } });
        expect(instance.run()).rejects.toThrow('bug');
        await Bun.sleep(10);
        expect(source.calls).toBe(1);
    });
});

describe('YoutubeProvider', () => {
    test('matches channel and video urls with its pattern', () => {
        const pattern = new RegExp(YoutubeProvider.PROVIDER.regex);
        expect(pattern.exec('https://www.youtube.com/watch?v=abc123')?.groups?.video_id).toBe('abc123');
        expect(pattern.exec('https://youtube.com/@someone')?.groups?.channel_id_vanity).toBe('someone');
        expect(pattern.exec('https://youtu.be/xyz')?.groups?.video_id_short).toBe('xyz');
    });

    test('identifies rooms by video id', () => {
        expect(YoutubeProvider.PROVIDER.id.join('video').key()).toBe(new Identifier('com.omuapps', 'chatprovider', 'youtube', 'video').key());
    });
});
