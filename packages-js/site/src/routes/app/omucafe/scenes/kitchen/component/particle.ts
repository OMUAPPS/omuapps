import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import type { Game } from '../../../core/game';

export class ParticleRenderer {
    private static readonly COUNT = 3;
    private static readonly DURATION_MS = 8000;

    constructor(private readonly game: Game) {}

    render() {
        if (!this.game.states.config.value.photo.effects.flash) return;

        const { draw } = this.game.pipeline;
        const { renderer } = this.game;
        const elapsed = Timer.now();
        const timeOffset = ParticleRenderer.DURATION_MS / (ParticleRenderer.COUNT + 1);

        for (let index = 0; index < ParticleRenderer.COUNT; index++) {
            const particleElapsed = elapsed + index * timeOffset;
            const particleIndex = Math.floor(particleElapsed / ParticleRenderer.DURATION_MS) * ParticleRenderer.COUNT + index;
            const particleTime = (particleElapsed % ParticleRenderer.DURATION_MS) / ParticleRenderer.DURATION_MS;

            const opacity = Math.sqrt(Math.sin(particleTime * Math.PI));
            const rng = ARC4.fromNumber(particleIndex);
            const pos = renderer.bounds.at({ x: rng.next(), y: rng.next() });
            const scale = rng.next() * 24;

            draw.circle(pos.x + particleTime * 400, pos.y + particleTime * 300 * rng.next(), 0, scale * opacity, Vec4.ONE.with({ w: opacity * 0.1 }));
        }
    }
}
