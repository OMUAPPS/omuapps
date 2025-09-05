import { AABB2, type AABB2Like } from '$lib/math/aabb2.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import type { Asset } from '../asset/asset.js';
import type { AudioClip } from '../asset/audioclip.js';
import { uniqueId } from '../game/helper.js';
import { Time } from '../game/time.js';

export type EffectSound = {
    type: 'sound',
    clip: AudioClip,
};

export function createEffectSound(options: {
    clip: AudioClip,
}): EffectSound {
    const { clip } = options;
    return {
        type: 'sound',
        clip,
    };
}

type ParticleEmitter = {
    type: 'physics',
    count: number,
    duration: number,
    opacity: Vec2Like
    velocity: AABB2Like,
    acceleration: AABB2Like,
    scale: AABB2Like,
};

export function createParticleEmitter(options: Partial<ParticleEmitter>): ParticleEmitter {
    return {
        type: 'physics',
        count: options.count ?? 1,
        duration: options.duration ?? 1000,
        opacity: options.opacity ?? Vec2.ONE,
        velocity: options.velocity ?? AABB2.ZEROZERO,
        acceleration: options.acceleration ?? AABB2.ZEROZERO,
        scale: options.scale ?? AABB2.ONEONE,
    };
}

export type ParticleSource = {
    type: 'random',
    assets: Asset[],
};

export function createParticleSource(options: Partial<ParticleSource>): ParticleSource {
    return {
        type: 'random',
        assets: options.assets ?? [],
    };
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
    };
}

export type EffectAttributes = {
    sound: EffectSound,
    particle: EffectParticle,
};

export type EffectState = {
    id: string,
    name: string,
    attributes: Partial<EffectAttributes>,
    startTime: number,
};

export function createEffectState(options: {
    id?: string,
    name: string,
    attributes: Partial<EffectAttributes>,
}): EffectState {
    const { id, name, attributes } = options;
    return {
        id: id ?? uniqueId(),
        name,
        attributes,
        startTime: Time.now(),
    };
}
