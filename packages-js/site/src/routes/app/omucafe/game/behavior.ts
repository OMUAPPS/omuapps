import { ContainerHandler, type Container } from './behavior/container.js';
import { FixedHandler, type Fixed } from './behavior/fixed.js';
import type { KitchenItem } from './kitchen-item.js';
import type { KitchenContext } from './kitchen.js';

export type Behaviors = {
    container: Container;
    fixed: Fixed;
};

export const BEHAVIOR_HANDLERS: BehaviorHandlers = {
    container: ContainerHandler,
    fixed: FixedHandler,
};

type BehaviorHandlers<T extends keyof Behaviors = keyof Behaviors> = {
    [K in T]: BehaviorHandler<K>;
};

export type BehaviorAction<T extends keyof Behaviors> = {
    item: KitchenItem,
    behavior: Behaviors[T],
};

export type BehaviorFunction<T extends keyof Behaviors, U> = (context: KitchenContext, action: BehaviorAction<T>, args: U) => void;

export type BehaviorHandler<T extends keyof Behaviors> = Partial<{
    handleClickChild: BehaviorFunction<T, { child: KitchenItem }>,
    canItemBeHeld: BehaviorFunction<T, { canBeHeld: boolean }>,
}>;
