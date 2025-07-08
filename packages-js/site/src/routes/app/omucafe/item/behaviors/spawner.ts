import { copy } from '../../game/helper.js';
import type { BehaviorAction, BehaviorHandler, ClickAction } from '../behavior.js';
import { createItemState, removeItemState, type ItemState } from '../item-state.js';

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
    async retrieveActionsHovered(action: BehaviorAction<'spawner'>, args: { held: ItemState; hovering: ItemState; actions: ClickAction[]; }): Promise<void> {
        const { item, behavior, context } = action;
        const { held, actions } = args;
        if (args.held) {
            const { spawnItemId } = action.behavior;
            if (held.item.id === spawnItemId) {
                actions.push({
                    name: 'もとに戻す',
                    priority: 0,
                    callback: () => {
                        removeItemState(held);
                    }
                });
            }
        } else {
            actions.push({
                name: '持つ',
                priority: 0,
                callback: () => {
                    const config = context.config;
                    const newItem = createItemState(context, {
                        item: copy(config.items[behavior.spawnItemId]),
                    });
                    newItem.transform.offset = copy(item.transform.offset);
                    context.held = newItem.id;
                },
            });
        }
    }
};
