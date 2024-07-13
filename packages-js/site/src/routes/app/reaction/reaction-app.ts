import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/index.js';
import type { Writable } from 'svelte/store';
import { IDENTIFIER } from './app.js';
import type { Chat } from '@omujs/chat';
import { Reaction } from '@omujs/chat/models/reaction.js';
import type { Signal } from '@omujs/omu/extension/signal/signal.js';

type ReactionConfig = {
    replaces: Record<string, string | null>;
    scale: number;
};

const REACTION_REPLACE_REGISTRY_TYPE = RegistryType.createJson<ReactionConfig>(IDENTIFIER, {
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
    },
});

export class ReactionApp {
    public readonly config: Writable<ReactionConfig>;
    public readonly reactionSignal: Signal<Reaction>;

    constructor(
        private readonly omu: Omu,
        private readonly chat: Chat,
    ) {
        this.config = makeRegistryWritable(omu.registry.get(REACTION_REPLACE_REGISTRY_TYPE));
        this.reactionSignal = chat.reactionSignal;
    }

    public send(reaction: Reaction) {
        this.chat.reactionSignal.notify(reaction);
    }
}
