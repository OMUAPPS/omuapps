import type { Matrices } from '$lib/components/canvas/matrices.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import type { Component } from 'svelte';
import type { KitchenContext } from '../kitchen/kitchen.js';
import { ActionHandler, type Action } from './behaviors/action.js';
import { ContainerHandler, type Container } from './behaviors/container.js';
import { EffectHandler, type Effect } from './behaviors/effect.js';
import { HoldableHandler, type Holdable } from './behaviors/holdable.js';
import { LiquidHandler, type Liquid } from './behaviors/liquid.js';
import type { ItemRender, ItemState } from './item-state.js';

export type Behaviors = {
    container: Container;
    holdable: Holdable;
    action: Action;
    effect: Effect;
    liquid: Liquid;
};

export const getBehaviorHandlers = async () => ({
    liquid: new LiquidHandler(),
    container: new ContainerHandler(),
    holdable: new HoldableHandler(),
    action: new ActionHandler(),
    effect: new EffectHandler(),
}) satisfies BehaviorHandlers;

export type BehaviorHandlers<T extends keyof Behaviors = keyof Behaviors> = {
    [K in T]: BehaviorHandler<K>;
};

export type BehaviorAction<T extends keyof Behaviors> = {
    item: ItemState;
    behavior: Behaviors[T];
    context: KitchenContext;
};

export type BehaviorFunction<T extends keyof Behaviors, U> = (action: BehaviorAction<T>, args: U) => Promise<void> | void;

export type ClickAction = {
    name: string;
    priority: number;
    item: ItemState;
    callback: () => Promise<void> | void;
};

export interface BehaviorHandler<T extends keyof Behaviors> {
    initialize?(): Promise<void>;
    renderPre?(action: BehaviorAction<T>, args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender> }): Promise<void> | void;
    renderPost?(action: BehaviorAction<T>, args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender> }): Promise<void> | void;
    renderOverlay?(action: BehaviorAction<T>, args: { matrices: Matrices }): Promise<void> | void;
    collectActionsParent?(action: BehaviorAction<T>, args: { child: ItemState; held: ItemState | null; actions: ClickAction[] }): Promise<void> | void;
    collectActionsHeld?(action: BehaviorAction<T>, args: { hovering: ItemState | null; actions: ClickAction[] }): Promise<void> | void;
    collectActionsHovered?(action: BehaviorAction<T>, args: { held: ItemState | null; actions: ClickAction[] }): Promise<void> | void;
    handleChildrenOrder?(action: BehaviorAction<T>, args: { timing: 'hover'; children: ItemState[] }): Promise<void> | void;
    handleChildrenHovered?(action: BehaviorAction<T>, args: { target: ItemState | null }): Promise<void> | void;
    preLoadAssets?(action: BehaviorAction<T>, args: undefined): Promise<void> | void;
};

export type DefaultBehaviors<T extends keyof Behaviors = keyof Behaviors> = {
    [key in T]?: {
        name: string;
        key: key;
        default: Behaviors[key];
        edit: Component<{
            behavior: Behaviors[key];
        }, object, 'behavior'>;
    }
};
