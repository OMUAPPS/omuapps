import { AABB2 } from '$lib/math/aabb2.js';
import { lerp } from '$lib/math/math.js';
import type { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { getTextureByAsset } from '../../asset/asset.js';
import type { EffectParticle } from '../../effect/effect-state.js';
import { draw } from '../game.js';
import { ARC4 } from '../random.js';

function physicsEquation(
    position: Vec2,
    velocity: Vec2,
    acceleration: Vec2,
    time: number,
): Vec2 {
    // x=x0+v0t+1/2at^2
    return position.add(velocity.scale(time)).add(acceleration.scale(time * time / 2));
}

type ParticleOptions = {
    seed: string;
    time: number;
    bounds: AABB2;
};

function alphaFunc(t: number) {
    return Math.sin(t * Math.PI);
}

export async function renderParticles(particle: EffectParticle, args: ParticleOptions) {
    const { emitter, source } = particle;
    if (source.assets.length === 0) return;
    const random = ARC4.fromString(args.seed);
    const interval = emitter.duration / emitter.count;
    for (let i = 0; i < emitter.count; i ++) {
        const offset = interval * i;
        const elapsed = args.time - offset;
        if (elapsed < 0) continue;
        const index = Math.floor(elapsed / emitter.duration);
        const rnd = ARC4.fromNumber(random.next() + index);
        const position = args.bounds.at({ x: rnd.next(), y: rnd.next() });
        const velocity = AABB2.from(emitter.velocity).at({ x: rnd.next(), y: rnd.next() });
        const acceleration = AABB2.from(emitter.acceleration).at({ x: rnd.next(), y: rnd.next() });
        const scale = AABB2.from(emitter.scale).at({ x: rnd.next(), y: rnd.next() });
        const opacity = emitter.opacity && lerp(
            emitter.opacity.x,
            emitter.opacity.y,
            rnd.next(),
        ) || 1;
        const particleTime = (elapsed % emitter.duration) / 1000;
        const pos = physicsEquation(
            position,
            velocity,
            acceleration,
            particleTime,
        );
        const asset = rnd.choice(source.assets);
        const t = (elapsed % emitter.duration) / emitter.duration;
        const { tex, width, height } = await getTextureByAsset(asset);
        draw.texture(
            pos.x - width / 2 * scale.x,
            pos.y - height / 2 * scale.y,
            pos.x + width / 2 * scale.x,
            pos.y + height / 2 * scale.y,
            tex,
            new Vec4(1, 1, 1, alphaFunc(t) * opacity),
        );
    }
}
