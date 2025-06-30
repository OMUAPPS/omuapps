import { copy } from '../../game/helper.js';
import type { BehaviorFunction, BehaviorHandler } from '../behavior.js';
import { createItemState, type ItemState } from '../item-state.js';

export type Spawner = {
    spawnItemId: string,
}

export function createSpawner(options: { spawnItemId: string }): Spawner {
    const { spawnItemId } = options;
    return {
        spawnItemId: spawnItemId,
    };
}

export class SpawnerHandler implements BehaviorHandler<'spawner'> {
    handleClick: BehaviorFunction<'spawner', { x: number; y: number; }> = (context, action) => {
        const { item, behavior } = action;
        const config = context.config;
        const newItem = createItemState(context, {
            item: copy(config.items[behavior.spawnItemId]),
        });
        newItem.transform.offset = copy(item.transform.offset);
        context.held = newItem.id;
    };

    canItemBeHeld: BehaviorFunction<'spawner', { canBeHeld: boolean; }> = (context, action, args) => {
        args.canBeHeld = false;
    };

    handleDropChild: BehaviorFunction<'spawner', { child: ItemState; }> = (context, action, args) => {
        const { child } = args;
        const { spawnItemId } = action.behavior;
        if (child.item.id === spawnItemId) {
            delete context.items[args.child.id];
        }
    }
};
