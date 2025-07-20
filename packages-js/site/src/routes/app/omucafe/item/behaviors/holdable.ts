import { createClip, playAudioClip, type AudioClip } from '../../asset/audioclip.js';
import type { KitchenContext } from '../../kitchen/kitchen.js';
import type { BehaviorAction, BehaviorHandler, ClickAction } from '../behavior.js';

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
import type { ItemState } from '../item-state.js';

const DEFAULT_AUDIO_CLIP = createClip({
    asset: {
        type: 'url',
        url: pickup,
    },
    duration: 1000,
    playbackRate: 1.5,
});

export class HoldableHandler implements BehaviorHandler<'holdable'> {
    #canBeHeld(context: KitchenContext, behavior: Holdable) {
        if (behavior.editOnly) {
            return context.scene.type === 'kitchen_edit';
        }
        return true;
    }

    collectActionsHeld(action: BehaviorAction<'holdable'>, args: { hovering: ItemState | null; actions: ClickAction[]; }): Promise<void> | void {
        const { item, behavior, context } = action;
        const { actions } = args;
        actions.push({
            name: '置く',
            priority: 0,
            item,
            callback: async () => {
                context.held = null;
                playAudioClip(behavior.clip || await DEFAULT_AUDIO_CLIP);
            }
        });
    }

    collectActionsHovered(action: BehaviorAction<'holdable'>, args: { held: ItemState | null; actions: ClickAction[]; }): Promise<void> | void {
        const { item, behavior, context } = action;
        const { actions } = args;
        if (!this.#canBeHeld(context, behavior)) return;
        actions.push({
            name: '持つ',
            priority: 0,
            item,
            callback: async () => {
                context.held = item.id;
                playAudioClip(behavior.clip || await DEFAULT_AUDIO_CLIP);
            },
        });
    }
};
