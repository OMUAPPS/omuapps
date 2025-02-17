import type { BehaviorFunction, BehaviorHandler } from '../behavior.js';
import { createItemState } from '../item-state.js';
import type { Item } from '../item.js';

export type Spawner = {
    spawnItem: Item,
}

export function createSpaner(options: { spawnItem: Item }): Spawner {
    const { spawnItem } = options;
    return {
        spawnItem,
    };
}

export class SpawnerHandler implements BehaviorHandler<'spawner'> {
    handleClick: BehaviorFunction<'spawner', { x: number; y: number; }> = (context, action, args) => {
        const { item, behavior } = action;
        const newItem = createItemState(context, {
            item: behavior.spawnItem,
        });
        context.held = newItem.id;
    };
};
