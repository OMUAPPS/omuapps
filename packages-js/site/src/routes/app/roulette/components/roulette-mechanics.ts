
import { BetterMath } from '$lib/math.js';
import type { RouletteState } from '../state.js';

export class RouletteMechanics {
    public rotation = 0;
    public scale = 1;

    public velocity = 0;

    private lastRotation = 0;
    private lastTime = 0;

    private rouletteEasing(t: number) {
        const a = Math.pow(t, 0.1);
        const r = Math.pow(t, 0.3);
        return BetterMath.lerp(a, 1, r);
    }

    private zoomEasing(t: number) {
        return 1 + BetterMath.lerp(2 / (t + 1), 0, Math.pow(t, 0.5));
    }

    public update(
        state: RouletteState,
        entryCount: number,
        entryId: string | undefined,
        entryIndex: number,
        timeElapsed: number,
    ) {
        const now = Date.now();
        const prevRotation = this.rotation;

        if (state.type === 'idle' || state.type === 'recruiting') {
            const speed = Math.min(1, Math.sqrt(timeElapsed) / 1000);

            this.lastRotation = speed;
            this.rotation = this.lastRotation;
            this.scale = 1;
        } else if (state.type === 'spinning') {
            const offset = 1 / Math.max(1, entryCount);

            const hitRotation = entryIndex * offset + offset * state.random;

            const timeSinceStart = now - state.start;
            const remainingDuration = Math.max(0, state.duration - timeSinceStart);
            const progress = BetterMath.clamp01(timeSinceStart / state.duration);

            const t = this.rouletteEasing(progress);

            const rotateTo = hitRotation + Math.floor(0) + 10;

            this.rotation = BetterMath.lerp(0, rotateTo, t);
            this.scale = this.zoomEasing(t);

            this.lastRotation = this.rotation;
        } else if (state.type === 'spin-result') {
            const offset = 1 / Math.max(1, entryCount);
            const hitRotation = entryIndex * offset + offset * state.random;

            const rotateTo = hitRotation + Math.floor(this.rotation);

            this.rotation = rotateTo;
            this.lastRotation = rotateTo;
            this.scale = 1;
        }

        const dt = (now - this.lastTime) / 1000;
        if (dt > 0) {
            this.velocity = (this.rotation - prevRotation) / dt;
        }
        this.lastTime = now;
    }
}
