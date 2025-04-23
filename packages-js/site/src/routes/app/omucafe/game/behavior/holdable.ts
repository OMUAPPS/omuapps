import { createClip, playAudioClip, type AudioClip } from '../audioclip.js';
import type { BehaviorAction, BehaviorFunction, BehaviorHandler } from '../behavior.js';
import type { KitchenContext } from '../kitchen.js';

export type Holdable = {
    clip?: AudioClip,
};

export function createHoldable(): Holdable {
    return {
        clip: undefined,
    };
}

import pickup from '../../sounds/pickup.wav';

const DEFAULT_AUDIO_CLIP = createClip({
    id: 'default:pickup',
    asset: {
        type: 'url',
        url: pickup,
    }
})

export class HoldableHandler implements BehaviorHandler<'holdable'> {
    canItemBeHeld(
        context: KitchenContext,
        action: BehaviorAction<'holdable'>,
        args: { canBeHeld: boolean },
    ) {
        args.canBeHeld = true;
    }

    handleClick?: BehaviorFunction<'holdable', { x: number; y: number; }> = (context, action) => {
        const { item, behavior } = action;
        const config = context.config;
        const clip = behavior.clip || DEFAULT_AUDIO_CLIP;
        playAudioClip(clip);
    }
};
