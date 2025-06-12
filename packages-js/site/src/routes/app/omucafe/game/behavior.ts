import type { Matrices } from '$lib/components/canvas/matrices.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import type { TypedComponent } from '@omujs/ui';
import { ActionHandler, type Action } from './behavior/action.js';
import { ContainerHandler, type Container } from './behavior/container.js';
import { HoldableHandler, type Holdable } from './behavior/holdable.js';
import { SpawnerHandler, type Spawner } from './behavior/spawner.js';
import type { ItemRender, ItemState } from './item-state.js';
import type { KitchenContext } from './kitchen.js';

export type Behaviors = {
    container: Container;
    holdable: Holdable;
    spawner: Spawner;
    action: Action;
};

export const getBehaviorHandlers = async () => ({
    container: new ContainerHandler(),
    holdable: new HoldableHandler(),
    spawner: new SpawnerHandler(),
    action: new ActionHandler(),
}) as BehaviorHandlers;

export type BehaviorHandlers<T extends keyof Behaviors = keyof Behaviors> = {
    [K in T]: BehaviorHandler<K>;
};

export type BehaviorAction<T extends keyof Behaviors> = {
    item: ItemState,
    behavior: Behaviors[T],
};

export type BehaviorFunction<T extends keyof Behaviors, U> = (context: KitchenContext, action: BehaviorAction<T>, args: U) => Promise<void> | void;

export type BehaviorHandler<T extends keyof Behaviors> = Partial<{
    initialize?(): Promise<void>,
    render: BehaviorFunction<T, { matrices: Matrices, bufferBounds: AABB2, childRenders: Record<string, ItemRender> }>,
    handleDropChild: BehaviorFunction<T, { child: ItemState }>,
    handleClickChild: BehaviorFunction<T, { child: ItemState }>,
    handleClick: BehaviorFunction<T, { x: number, y: number }>,
    canItemBeHeld: BehaviorFunction<T, { canBeHeld: boolean }>,
    renderItemHoverTooltip: BehaviorFunction<T, { matrices: Matrices }>,
    handleChildrenOrder: BehaviorFunction<T, { timing: 'hover', children: ItemState[] }>,
    handleChildrenHovered: BehaviorFunction<T, { target: ItemState | null }>,
}>;

export type DefaultBehaviors<T extends keyof Behaviors = keyof Behaviors> = {
    [key in T]?: {
        name: string;
        key: key;
        default: Behaviors[key];
        edit: TypedComponent<{
            behavior: Behaviors[key];
        }>;
    }
}
