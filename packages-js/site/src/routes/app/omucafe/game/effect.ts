import type { Asset } from './asset.js';
import type { ADSRClip } from './audioclip.js';
import { uniqueId } from './helper.js';

type EffectAudio = {
    type: 'audio',
    clip: ADSRClip,
};

export function createEffectAudio(options: {
    clip: ADSRClip,
}): EffectAudio {
    const { clip } = options;
    return {
        type: 'audio',
        clip,
    };
}

type EffectParticle = {
    type: 'particle',
    asset: Asset,
};

type EffectAttributes = {
    audio: EffectAudio,
    particle: EffectParticle,
}

export type Effect = {
    id: string,
    name: string,
    attributes: Partial<EffectAttributes>,
};

export function createEffect(options: {
    id?: string,
    name: string,
    attributes: Partial<EffectAttributes>,
}): Effect {
    const { id, name, attributes } = options;
    return {
        id: id ?? uniqueId(),
        name,
        attributes,
    };
}
