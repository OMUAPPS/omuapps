import type { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext } from '$lib/components/canvas/glcontext.js';
import type { Matrices } from '$lib/components/canvas/matrices.js';
import { ActionHandler, type Action } from './behavior/action.js';
import { ContainerHandler, type Container } from './behavior/container.js';
import { FixedHandler, type Fixed } from './behavior/fixed.js';
import { SpawnerHandler, type Spawner } from './behavior/spawner.js';
import type { ItemState } from './item-state.js';
import type { KitchenContext } from './kitchen.js';

export type Behaviors = {
    container: Container;
    fixed: Fixed;
    spawner: Spawner;
    action: Action;
};

export const getBehaviorHandlers = () => ({
    container: new ContainerHandler(),
    fixed: new FixedHandler(),
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
    render: BehaviorFunction<T, { gl: GlContext, matrices: Matrices, draw: Draw }>,
    handleDropChild: BehaviorFunction<T, { child: ItemState }>,
    handleClickChild: BehaviorFunction<T, { child: ItemState }>,
    handleClick: BehaviorFunction<T, { x: number, y: number }>,
    canItemBeHeld: BehaviorFunction<T, { canBeHeld: boolean }>,
    renderItemHoverTooltip: BehaviorFunction<T, { x: number, y: number }>,
}>;
