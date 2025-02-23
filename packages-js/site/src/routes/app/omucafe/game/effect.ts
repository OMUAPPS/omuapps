import type { Asset } from './asset.js';
import { uniqueId } from './helper.js';

type EffectAudio = {
    type: 'audio',
    asset: Asset,
    volume: number,
};

export function createEffectAudio(options: {
    asset: Asset,
    volume: number,
}): EffectAudio {
    const { asset, volume } = options;
    return {
        type: 'audio',
        asset,
        volume,
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
