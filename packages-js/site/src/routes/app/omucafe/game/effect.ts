import { AABB2, type AABB2Like } from '$lib/math/aabb2.js';
import type { Asset } from './asset.js';
import type { ADSRClip } from './audioclip.js';
import { uniqueId } from './helper.js';
import { Time } from './time.js';

export type EffectAudio = {
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

type ParticleEmitter = {
    type: 'physics',
    count: number,
    duration: number,
    velocity: AABB2Like,
    acceleration: AABB2Like,
    scale: AABB2Like,
}

export function createParticleEmitter(options: Partial<ParticleEmitter>): ParticleEmitter {
    return {
        type: 'physics',
        count: options.count ?? 1,
        duration: options.duration ?? 1000,
        velocity: options.velocity ?? AABB2.ZEROZERO,
        acceleration: options.acceleration ?? AABB2.ZEROZERO,
        scale: options.scale ?? AABB2.ZEROZERO,
    }
}

export type ParticleSource = {
    type: 'random',
    assets: Asset[],
}

export function createParticleSource(options: Partial<ParticleSource>): ParticleSource {
    return {
        type: 'random',
        assets: options.assets ?? [],
    }
}

export type EffectParticle = {
    type: 'particle',
    source: ParticleSource,
    emitter: ParticleEmitter,
};

export function createParticle(options: Partial<EffectParticle>): EffectParticle {
    return {
        type: 'particle',
        source: options.source ?? createParticleSource({}),
        emitter: options.emitter ?? createParticleEmitter({}),
    }
}

export type EffectAttributes = {
    audio: EffectAudio,
    particle: EffectParticle,
}

export type Effect = {
    id: string,
    name: string,
    attributes: Partial<EffectAttributes>,
    startTime: number,
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
        startTime: Time.now(),
    };
}
