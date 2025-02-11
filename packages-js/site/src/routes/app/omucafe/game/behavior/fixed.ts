import type { BehaviorHandler } from '../behavior.js';
import { copy } from '../helper.js';
import type { KitchenContext } from '../kitchen.js';
import { createTransform, type Transform } from '../transform.js';

export type Fixed = {
    transform: Transform,
}

export function createFixed(options: {transform?: Transform}): Fixed {
    const { transform } = options;
    return {
        transform: copy(transform || createTransform()),
    };
}

export const FixedHandler: BehaviorHandler<'fixed'> = {
    canItemBeHeld(
        context: KitchenContext,
        action,
        args: { canBeHeld: boolean },
    ) {
        args.canBeHeld = false;
    },
};
