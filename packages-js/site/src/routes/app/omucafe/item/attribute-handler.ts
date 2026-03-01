import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import type { InputEventMouse } from '$lib/components/canvas/pipeline';
import type { AABB2 } from '$lib/math/aabb2';
import type { Vec2 } from '$lib/math/vec2';
import type { Action } from '../core/input-system';
import type { Item, ItemPool } from './item';

export interface AttributeInvoke<Attr> {
    attr: Attr;
    item: Item;
}

export interface ItemRender {
    update: number;
    texture: GlTexture;
    target: GlFramebuffer;
    bounds: AABB2;
}

export type ItemRenderState = {
    type: 'loading';
    tasks: LoadTask[];
    update: number;
} | {
    type: 'rendering';
    render: ItemRender;
    update: number;
} | {
    type: 'rendered';
    render: ItemRender;
    update: number;
};

export interface LoadTask {
    title: string;
    done: boolean;
    resolve(): void;
}

export type ItemMouseEvent = InputEventMouse & {
    offset: Vec2;
    offsetPrev: Vec2;
    offsetDelta: Vec2;
};

export interface LoadContext {
    create(options: { title: string }): LoadTask;
}

export interface AttributeHandler<T> {
    load?(invoke: AttributeInvoke<T>, ctx: LoadContext): Promise<void>;
    bounds?(invoke: AttributeInvoke<T>, result: { render: AABB2 }, children: Record<string, ItemRender>): Promise<void>;
    renderPre?(invoke: AttributeInvoke<T>, render: ItemRender): Promise<void>;
    renderChildren?(invoke: AttributeInvoke<T>, render: ItemRender, children: Record<string, ItemRender>): Promise<void>;
    renderPost?(invoke: AttributeInvoke<T>, render: ItemRender, children: Record<string, ItemRender>): Promise<void>;
    renderOverlay?(invoke: AttributeInvoke<T>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void>;
    overlay?(invoke: AttributeInvoke<T>, render: ItemRender): Promise<void>;
    actions?(invoke: AttributeInvoke<T>, pool: ItemPool, event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void>;
    collide?(invoke: AttributeInvoke<T>, pool: ItemPool, event: ItemMouseEvent): Promise<void>;
    mouse?(invoke: AttributeInvoke<T>, pool: ItemPool, event: ItemMouseEvent): Promise<void>;
}
