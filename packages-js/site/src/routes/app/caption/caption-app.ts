import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { type Signal } from '@omujs/omu/extension/signal/signal.js';
import type { Writable } from 'svelte/store';
import { CAPTION_SIGNAL, CONFIG_REGISTRY, type Caption, type Config } from './types.js';

export class CaptionApp {
    private readonly listeners = new Set<(caption: Caption) => void>();
    private readonly captionSignal: Signal<Caption>;
    public readonly config: Writable<Config>;

    constructor(omu: Omu) {
        this.captionSignal = omu.signals.get(CAPTION_SIGNAL);
        this.captionSignal.listen((caption) => {
            for (const listener of this.listeners) {
                listener(caption);
            }
        });
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
    }

    public setCaption(caption: Caption) {
        this.captionSignal.notify(caption);
    }

    public listen(listener: (caption: Caption) => void) {
        this.listeners.add(listener);
    }
}
