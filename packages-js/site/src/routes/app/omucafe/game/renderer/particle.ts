import { Vec4 } from '$lib/math/vec4.js';
import type { Texture } from '../asset.js';
import { draw, matrices } from '../game.js';

type Particle = {
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    maxLife: number,
}
type ParticleEffect = {
    particles: Particle[],
    animate: (particle: Particle) => void,
    lastSpawn: number,
    tex: Texture,
}

export const particleCache: Map<string, ParticleEffect> = new Map();

export async function renderParticles() {
    for (const [id, effect] of particleCache) {
        const { particles, tex: image } = effect;
        for (const particle of particles) {
            const { x, y, vx, vy, life, maxLife } = particle;
            const alpha = life / maxLife;
            const color = new Vec4(1, 1, 1, alpha);
            matrices.model.push();
            matrices.model.translate(x, y, 0);
            matrices.model.scale(0.5, 0.5, 1);
            draw.textureOutline(
                0, 0,
                image.width, image.height,
                image.tex,
                new Vec4(0, 0, 0, 0.23),
                2,
            );
            draw.texture(
                0, 0,
                image.width, image.height,
                image.tex,
                color,
            );
            matrices.model.pop();
            effect.animate(particle);
        }
        effect.particles = particles.filter(particle => particle.life > 0);
    }
}
