import type { Matrices } from '$lib/components/canvas/matrices.js';
import { playAudioClip } from '../../asset/audioclip.js';
import type { EffectState } from '../../effect/effect-state.js';
import { renderParticles } from '../../game/renderer/particle.js';
import { Time } from '../../game/time.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import { calculateItemStateRenderTransform } from '../item-state.js';

export type Effect = {
    effects: Record<string, EffectState>,
};

export function createEffect(): Effect {
    return {
        effects: {},
    };
}


export class EffectHandler implements BehaviorHandler<'effect'> {
    async renderOverlay(action: BehaviorAction<'effect'>, args: { matrices: Matrices; }): Promise<void> {
        const { item, behavior } = action;
        const transform = calculateItemStateRenderTransform(item);
        const renderBounds = transform.transformAABB2(item.bounds);
        for (const [effectId, effect] of Object.entries(behavior.effects)) {
            const { startTime } = effect;
            const effectTime = Time.now() - startTime;
            const { particle, sound } = effect.attributes;
            if (particle) {
                await renderParticles(particle, {
                    seed: effect.id,
                    bounds: renderBounds,
                    time: effectTime,
                });
            }
            if (sound) {
                await playAudioClip(sound.clip, {
                    type: 'effect',
                    item: item.id,
                    effect: effectId,
                })
            }
        }
    }
};
