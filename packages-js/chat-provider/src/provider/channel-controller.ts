import type { Models } from '@omujs/chat';
import type { Identifier } from '@omujs/omu';

import { type ChannelActivity, type ChatProvider, ProviderTemporarilyUnavailable } from './chat-provider.js';

class ChannelState {
    public revision = 0;
    public running: Promise<void> | undefined;

    public constructor(
        public channel: Models.Channel,
        public active: boolean,
    ) {}
}

export class ChannelController implements ChannelActivity {
    private readonly states = new Map<string, ChannelState>();

    public constructor(private readonly providers: ReadonlyMap<string, ChatProvider>) {}

    public isActive(id: Identifier): boolean {
        return this.states.get(id.key())?.active ?? false;
    }

    public async update(channel: Models.Channel): Promise<void> {
        await this.request(this.change(channel, channel.active));
    }

    public async remove(channel: Models.Channel): Promise<void> {
        await this.request(this.change(channel, false));
    }

    public async bootstrap(channels: Iterable<Models.Channel>): Promise<void> {
        const list = [...channels];
        const current = new Set(list.map((channel) => channel.id.key()));
        const removed = [...this.states.entries()]
            .filter(([key]) => !current.has(key))
            .map(([, state]) => this.remove(state.channel));
        await Promise.all([...removed, ...list.map((channel) => this.update(channel))]);
    }

    public async refresh(): Promise<void> {
        const states = [...this.states.values()].filter((state) => state.active);
        for (const state of states) {
            state.revision += 1;
        }
        await Promise.all(states.map((state) => this.request(state)));
    }

    private change(channel: Models.Channel, active: boolean): ChannelState {
        const existing = this.states.get(channel.id.key());
        if (!existing) {
            const state = new ChannelState(channel, active);
            this.states.set(channel.id.key(), state);
            return state;
        }
        existing.channel = channel;
        existing.active = active;
        existing.revision += 1;
        return existing;
    }

    private async request(state: ChannelState): Promise<void> {
        state.running ??= this.run(state).finally(() => {
            state.running = undefined;
        });
        await state.running;
    }

    private async run(state: ChannelState): Promise<void> {
        while (true) {
            const { revision, channel, active } = state;
            const provider = this.providers.get(channel.providerId.key());
            if (!provider) {
                console.warn(`Provider ${channel.providerId.key()} not found for channel ${channel.key()}`);
            } else {
                await ChannelController.apply(provider, channel, active);
            }
            if (revision === state.revision) return;
        }
    }

    private static async apply(provider: ChatProvider, channel: Models.Channel, active: boolean): Promise<void> {
        try {
            if (active) await provider.startChannel(channel);
            else await provider.stopChannel(channel);
        } catch (error) {
            if (error instanceof ProviderTemporarilyUnavailable) {
                console.warn(`Channel ${channel.key()} temporarily unavailable; retrying next refresh: ${error.message}`);
                return;
            }
            console.error(`Error ${active ? 'starting' : 'stopping'} channel ${channel.key()}`, error);
        }
    }
}
