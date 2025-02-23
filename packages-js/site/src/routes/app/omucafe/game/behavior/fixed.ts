import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import type { KitchenContext } from '../kitchen.js';

export type Fixed = object;

export function createFixed(): Fixed {
    return {
    };
}

export class FixedHandler implements BehaviorHandler<'fixed'> {
    canItemBeHeld(
        context: KitchenContext,
        action: BehaviorAction<'fixed'>,
        args: { canBeHeld: boolean },
    ) {
        args.canBeHeld = false;
    }
};
