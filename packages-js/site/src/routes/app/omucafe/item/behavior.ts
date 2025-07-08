import type { Matrices } from '$lib/components/canvas/matrices.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import type { TypedComponent } from '@omujs/ui';
import type { KitchenContext } from '../kitchen/kitchen.js';
import { ActionHandler, type Action } from './behaviors/action.js';
import { ContainerHandler, type Container } from './behaviors/container.js';
import { HoldableHandler, type Holdable } from './behaviors/holdable.js';
import { SpawnerHandler, type Spawner } from './behaviors/spawner.js';
import type { ItemRender, ItemState } from './item-state.js';

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
}) satisfies BehaviorHandlers;

export type BehaviorHandlers<T extends keyof Behaviors = keyof Behaviors> = {
    [K in T]: BehaviorHandler<K>;
};

export type BehaviorAction<T extends keyof Behaviors> = {
    item: ItemState,
    behavior: Behaviors[T],
    context: KitchenContext,
};

export type BehaviorFunction<T extends keyof Behaviors, U> = (action: BehaviorAction<T>, args: U) => Promise<void> | void;

export type ClickAction = {
    name: string;
    priority: number;
    item: ItemState,
    callback: () => Promise<void> | void;
}

export type BehaviorHandler<T extends keyof Behaviors> = Partial<{
    initialize?(): Promise<void>,
    render?(action: BehaviorAction<T>, args: { matrices: Matrices, bufferBounds: AABB2, childRenders: Record<string, ItemRender> }): Promise<void> | void,
    retrieveActionsParent?(action: BehaviorAction<T>, args: { child: ItemState, held: ItemState | null, actions: ClickAction[] }): Promise<void> | void,
    retrieveActionsHeld?(action: BehaviorAction<T>, args: { hovering: ItemState | null, actions: ClickAction[] }): Promise<void> | void,
    retrieveActionsHovered?(action: BehaviorAction<T>, args: { held: ItemState | null, actions: ClickAction[] }): Promise<void> | void,
    handleChildrenOrder?(action: BehaviorAction<T>, args: { timing: 'hover', children: ItemState[] }): Promise<void> | void,
    handleChildrenHovered?(action: BehaviorAction<T>, args: { target: ItemState | null }): Promise<void> | void,
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
