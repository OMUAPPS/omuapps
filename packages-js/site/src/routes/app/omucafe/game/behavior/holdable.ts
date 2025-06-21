import { createClip, playAudioClip, type AudioClip } from '../audioclip.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import type { KitchenContext } from '../kitchen.js';

export type Holdable = {
    clip?: AudioClip,
    editOnly?: boolean,
};

export function createHoldable(options?: Holdable): Holdable {
    return {
        clip: options?.clip,
        editOnly: options?.editOnly,
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
    #canBeHeld(context: KitchenContext, behavior: Holdable) {
        if (behavior.editOnly) {
            return context.scene.type === 'kitchen_edit';
        }
        return true;
    }

    canItemBeHeld(
        context: KitchenContext,
        action: BehaviorAction<'holdable'>,
        args: { canBeHeld: boolean },
    ) {
        const { behavior } = action;
        args.canBeHeld ||= this.#canBeHeld(context, behavior);
    }

    handleClick(
        context: KitchenContext,
        action: BehaviorAction<'holdable'>,
        args: { x: number; y: number; },
    ) {
        const { behavior } = action;
        if (!this.#canBeHeld(context, behavior)) return;
        const clip = behavior.clip || DEFAULT_AUDIO_CLIP;
        playAudioClip(clip);
    }
};
