import { describe, expect, test } from 'bun:test';

import { Models } from '@omujs/chat';
import { Identifier } from '@omujs/omu';

import { ChannelController, type ChatProvider, ProviderPattern, ProviderTemporarilyUnavailable, RoomCheck } from '../src';

class FakeProvider implements ChatProvider {
    public readonly calls: string[] = [];
    public onlineResult: boolean | Error = true;
    public release: (() => void) | undefined;

    public readonly provider: Models.Provider = new Models.Provider({
        id: new Identifier('com.example', 'provider'),
        url: 'example.com',
        name: 'Example',
        version: '0.0.0',
        repository_url: '',
        description: '',
        regex: '',
    });

    public async startUrl(): Promise<void> {}

    public async startChannel(channel: Models.Channel): Promise<void> {
        this.calls.push(`start ${channel.name}`);
        if (this.release) await new Promise<void>((resolve) => {
            const release = this.release;
            this.release = () => {
                release?.();
                resolve();
            };
        });
    }

    public async stopChannel(channel: Models.Channel): Promise<void> {
        this.calls.push(`stop ${channel.name}`);
    }

    public async stopRoom(): Promise<void> {}

    public async isOnline(): Promise<boolean> {
        if (this.onlineResult instanceof Error) throw this.onlineResult;
        return this.onlineResult;
    }
}

class Fixtures {
    public static channel(name: string, active: boolean): Models.Channel {
        const providerId = new Identifier('com.example', 'provider');
        return new Models.Channel({ providerId, id: providerId.join('channel'), url: '', name, description: '', active, iconUrl: '' });
    }

    public static room(channelId?: string): Models.Room {
        return new Models.Room({
            id: new Identifier('com.example', 'provider', 'room'),
            providerId: new Identifier('com.example', 'provider'),
            connected: true,
            status: 'online',
            metadata: {},
            channelId,
            createdAt: new Date(),
        });
    }
}

describe('RoomCheck', () => {
    test.each([
        [true, false],
        [false, true],
        [new ProviderTemporarilyUnavailable('503'), false],
        [new Error('other provider'), true],
    ])('keeps unknown connections and removes offline rooms (%p -> %p)', async (outcome, expected) => {
        const provider = new FakeProvider();
        provider.onlineResult = outcome;
        const check = new RoomCheck({ isActive: () => true });
        expect(await check.shouldRemove(Fixtures.room(), provider)).toBe(expected);
    });

    test('removes a room of an inactive channel without asking the provider', async () => {
        const provider = new FakeProvider();
        provider.onlineResult = new ProviderTemporarilyUnavailable('503');
        const check = new RoomCheck({ isActive: () => false });
        expect(await check.shouldRemove(Fixtures.room('com.example:provider/channel'), provider)).toBe(true);
    });
});

describe('ChannelController', () => {
    test('starts active channels and stops removed ones', async () => {
        const provider = new FakeProvider();
        const controller = new ChannelController(new Map([[provider.provider.id.key(), provider]]));
        await controller.update(Fixtures.channel('first', true));
        expect(controller.isActive(new Identifier('com.example', 'provider', 'channel'))).toBe(true);
        await controller.remove(Fixtures.channel('first', true));
        expect(provider.calls).toEqual(['start first', 'stop first']);
        expect(controller.isActive(new Identifier('com.example', 'provider', 'channel'))).toBe(false);
    });

    test('applies the latest state once after changes during a running request', async () => {
        const provider = new FakeProvider();
        provider.release = () => {};
        const controller = new ChannelController(new Map([[provider.provider.id.key(), provider]]));
        const first = controller.update(Fixtures.channel('first', true));
        await Bun.sleep(1);
        const second = controller.update(Fixtures.channel('second', true));
        const third = controller.update(Fixtures.channel('third', true));
        const release = provider.release;
        provider.release = undefined;
        release?.();
        await Promise.all([first, second, third]);
        expect(provider.calls).toEqual(['start first', 'start third']);
    });
});

describe('ProviderPattern', () => {
    test('reads patterns stored with Python named groups', () => {
        const pattern = ProviderPattern.compile(String.raw`(https?://)?(www.)?twitch\.tv\/(?P<id>[\w=-]+)`);
        expect(pattern.exec('https://www.twitch.tv/someone')?.groups?.id).toBe('someone');
    });
});
