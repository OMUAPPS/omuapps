import type { Chat } from '@omujs/chat';
import { Reaction } from '@omujs/chat/models';
import type { Omu } from '@omujs/omu';
import { RegistryType, type Registry } from '@omujs/omu/api/registry';
import type { Signal } from '@omujs/omu/api/signal';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

type ReactionConfig = {
    replaces: Record<string, string | null>;
    scale: number;
    depth: number;
};

const REACTION_REPLACE_REGISTRY_TYPE = RegistryType.createJson<ReactionConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        replaces: {
            '❤': null,
            '😄': null,
            '🎉': null,
            '😳': null,
            '💯': null,
        },
        scale: 1,
        depth: 0,
    },
});

export class ReactionApp {
    public readonly config: Writable<ReactionConfig>;
    public readonly configRegistry: Registry<ReactionConfig>;
    public readonly reactionSignal: Signal<Reaction>;

    constructor(
        private readonly omu: Omu,
        private readonly chat: Chat,
    ) {
        this.configRegistry = omu.registries.get(REACTION_REPLACE_REGISTRY_TYPE);
        this.config = this.configRegistry.compatSvelte();
        this.reactionSignal = chat.reactionSignal;
    }

    public send(reaction: Reaction) {
        this.chat.reactionSignal.notify(reaction);
    }
}
