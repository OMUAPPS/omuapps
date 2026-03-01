import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import type { Mat4 } from '$lib/math/mat4';
import type { Transform2D } from '$lib/math/transform2d';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import type { BufferedMap } from '../core/game-state';
import { clone } from '../core/helper';
import type { Action } from '../core/input-system';
import { getTransform, type Transform } from '../core/transform';
import type { Attributes } from './attribute';
import type { ItemMouseEvent, ItemRender, ItemRenderState, LoadTask } from './attribute-handler';
import { AttributeRegistry } from './attribute-registry';

// --- Interfaces ---

export interface Item {
    readonly id: string;
    readonly attrs: Attributes;
    transform: Transform;
    children: string[];
    update: number;
    parent?: string;
}

export interface ItemRef {
    readonly id: string;
}

export interface ItemPool {
    items: Record<string, ItemRef>;
}

export interface ItemSystemState {
    hovered?: string;
    held?: string;
}

export interface PoolOptions {
    transform: Mat4;
    bounds: AABB2;
}
// --- Constants ---

const EPOCH_OFFSET = 946684800000;

// --- System ---

export class ItemSystem {
    public readonly name = 'ItemSystem';

    private readonly attributeRegistry: AttributeRegistry;
    private readonly actions: Action[] = [];
    public readonly items: BufferedMap<Item>;
    public readonly states: ItemSystemState;

    private itemCounter = 0;
    private itemRender: Map<string, ItemRenderState> = new Map();
    private loadingItems: Map<string, LoadTask[]> = new Map();

    constructor(private readonly game: Game) {
        this.items = game.states.items;
        this.states = game.states.itemStates.value;
        this.attributeRegistry = AttributeRegistry.new(game);
        this.garbageCollection();
    }

    private garbageCollection() {
        const registryString = [
            JSON.stringify(this.game.states.kitchen.value),
            JSON.stringify(this.game.states.scene.value),
        ].join('');
        const activeItems: Item[] = [];
        for (const [id, item] of this.items.entries()) {
            const contained = registryString.includes(id);
            if (!contained) continue;
            activeItems.push(item);
        }
        const toKeep: Map<string, Item> = new Map();
        while (activeItems.length > 0) {
            const item = activeItems.pop();
            if (!item) continue;
            const toRemove: string[] = [];
            for (const childId of item.children) {
                const child = this.items.get(childId);
                if (!child) {
                    toRemove.push(childId);
                    continue;
                }
                if (child.parent !== item.id) {
                    // Inconsistent parent-child relationship, break it by detaching the child
                    toRemove.push(childId);
                    continue;
                }
                if (toKeep.has(childId)) {
                    // Recursive loop detected, break it by detaching the child
                    toRemove.push(childId);
                    continue;
                }
                activeItems.push(child);
            }
            for (const id of toRemove) {
                const idx = item.children.indexOf(id);
                if (idx !== -1) item.children.splice(idx, 1);
                this.items.delete(id);
            }
            toKeep.set(item.id, item);
        }
        const toRemove = [];
        for (const id of this.items.keys()) {
            if (!toKeep.has(id)) {
                toRemove.push(id);
            }
        }
        for (const id of toRemove) {
            this.items.delete(id);
        }
    }

    // =========================================================================================
    // Lifecycle & Allocation
    // =========================================================================================

    private generateUid(): string {
        const count = this.itemCounter++;
        const timestamp = Date.now() - EPOCH_OFFSET;
        return (timestamp + count).toString(36);
    }

    public allocateItem(item: Omit<Item, 'id' | 'update'>): Item {
        const id = this.generateUid();
        const allocItem: Item = {
            ...clone(item),
            id,
            update: 0,
        };
        this.items.set(id, allocItem);
        return allocItem;
    }

    // =========================================================================================
    // Rendering
    // =========================================================================================

    public async renderPool(pool: ItemPool, options: PoolOptions): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        const poolItems = Object.values(pool.items);
        matrices.view.push();
        matrices.view.multiply(options.transform);

        // Render Items
        for (const { id } of poolItems) {
            const item = this.items.get(id);
            if (!item) {
                // Garbage collection: Remove reference if item no longer exists
                delete pool.items[id];
                continue;
            }
            // Skip if child (children are rendered by parents)
            if (item.parent) continue;

            const renderState = await this.getItemRender(item);
            if (renderState.type === 'rendered') {
                const { bounds, texture } = renderState.render;
                matrices.model.push();
                matrices.model.multiply(getTransform(item.transform).getMat4());
                draw.textureColor(bounds.min.x, bounds.min.y + 20, bounds.max.x, bounds.max.y + 15, texture, PALETTE_RGB.ITEM_SHADOW);
                draw.texture(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture);
                matrices.model.pop();
            }
        }

        // overlay
        for (const { id } of poolItems) {
            const item = this.items.get(id);
            if (!item) {
                // Garbage collection: Remove reference if item no longer exists
                delete pool.items[id];
                continue;
            }
            // Skip if child (children are rendered by parents)

            const renderState = await this.getItemRender(item);
            const childrenRender = await this.gatherChildrenItemRender(item);
            if (renderState.type === 'rendered' && childrenRender) {
                const { bounds } = renderState.render;
                matrices.model.push();
                matrices.model.multiply(this.getWorldTransform(item).getMat4());
                await this.attributeRegistry.emit('renderOverlay', item, pool, renderState.render, childrenRender);
                matrices.model.pop();
            }
        }

        this.game.inputSystem.add(...this.actions);
        matrices.view.pop();
    }

    public getWorldTransform(item: Item): Transform2D {
        let transform = getTransform(item.transform);
        let current = item;
        while (current.parent) {
            const parent = this.items.get(current.parent);
            if (!parent) break;
            transform = getTransform(parent.transform).multiply(transform);
            current = parent;
        }
        return transform;
    }

    public updateItem(item: Item) {
        item.update ++;
        if (item.parent) {
            const parent = this.items.get(item.parent);
            if (!parent) {
                item.parent = undefined;
                return;
            }
            this.updateItem(parent);
        }
    }

    private getParents(item: Item): Item[] {
        const parents: Item[] = [];
        let current = item;
        while (current.parent) {
            const parent = this.items.get(current.parent);
            if (!parent) break;
            parents.push(parent);
            current = parent;
        }
        return parents;
    }

    public dettachItem(item: Item) {
        if (item.parent) {
            const parent = this.items.get(item.parent);
            if (parent) {
                const containerTransform = this.getWorldTransform(parent);
                const itemTransform = getTransform(item.transform);
                const transformInContainer = containerTransform.multiply(itemTransform);
                item.transform = transformInContainer.toJSON();

                parent.children = parent.children.filter(id => id !== item.id);
                this.updateItem(parent);
            }
            item.parent = undefined;
            this.updateItem(item);
        }
    }

    public attachItem(parent: Item, child: Item) {
        if (parent.id === child.id) {
            throw new Error('Cannot attach item to itself');
        }
        const parents = this.getParents(parent);
        if (parents.some(p => p.id === child.id)) {
            throw new Error('Cannot attach item to its descendant');
        }
        const containerTransform = this.game.itemSystem.getWorldTransform(parent);
        const itemTransform = this.game.itemSystem.getWorldTransform(child);
        const worldToContainerTransform = containerTransform.affineInverse();
        const transformInContainer = worldToContainerTransform.multiply(itemTransform);
        child.transform = transformInContainer.toJSON();

        child.parent = parent.id;
        parent.children = [...parent.children, child.id];
        this.updateItem(child);
    }

    public async getItemRender(item: Item): Promise<ItemRenderState> {
        // 1. Loading Check
        const tasks = await this.loadItem(item);
        if (tasks.length > 0) {
            return { type: 'loading', tasks, update: item.update };
        }

        // 2. Cache Check
        const existing = this.itemRender.get(item.id);
        if (existing && existing.update === item.update) {
            return existing;
        }

        // Pass 2: Render Children first
        const childrenRender = await this.gatherChildrenItemRender(item);
        if (!childrenRender) {
            throw new Error('Failed to gather children renders');
        }

        // 3. Render Fresh
        const render = existing?.type !== 'loading' && existing?.render || await this.createItemRender(item, childrenRender);

        render.bounds = await this.getItemRenderBounds(item, childrenRender);
        render.texture.use(() => {
            const dimensions = render.bounds.dimensions();
            render.texture.ensureSize(dimensions.x, dimensions.y);
        });

        // Mark as rendering (optimistic)
        const renderingState: ItemRenderState = { type: 'rendering', render, update: item.update };
        this.itemRender.set(item.id, renderingState);

        await this.renderItemToTarget(render, item, childrenRender);

        // Mark as rendered
        const renderedState: ItemRenderState = { type: 'rendered', render, update: item.update };
        this.itemRender.set(item.id, renderedState);

        return renderedState;
    }

    private async gatherChildrenItemRender(item: Item) {
        const childrenRender: Record<string, ItemRender> = {};
        for (const id of item.children) {
            const data = this.items.get(id);
            if (!data) continue;

            const status = await this.getItemRender(data);
            if (status.type === 'rendered') {
                childrenRender[id] = status.render;
            } else {
                // If a child is not ready, we might want to abort or skip.
                // Current logic aborts the rest of the render.
                return;
            }
        }
        return childrenRender;
    }

    private async renderItemToTarget(render: ItemRender, item: Item, childrenRender: Record<string, ItemRender>): Promise<void> {
        const { bounds, target } = render;
        const { context, matrices } = this.game.pipeline;
        const dims = bounds.dimensions();

        // Pass 1: Pre-render
        await target.useAsync(async () => {
            context.stateManager.pushViewport(dims);
            await matrices.scopeAsync(async () => {
                matrices.identity();
                matrices.projection.orthographic(bounds.min.x, bounds.max.y, bounds.max.x, bounds.min.y, -1, 1);
                context.gl.clearColor(0, 0, 0, 0);
                context.gl.clear(context.gl.COLOR_BUFFER_BIT);
                await this.attributeRegistry.emit('renderPre', item, render);
            });
            context.stateManager.popViewport();
        });

        // Pass 3: Post-render (Composite)
        await target.useAsync(async () => {
            context.stateManager.pushViewport(dims);
            await matrices.scopeAsync(async () => {
                matrices.identity();
                matrices.view.identity();
                matrices.projection.orthographic(bounds.min.x, bounds.max.y, bounds.max.x, bounds.min.y, -1, 1);
                await this.attributeRegistry.emit('renderChildren', item, render, childrenRender);
                await this.attributeRegistry.emit('renderPost', item, render, childrenRender);
            });
            context.stateManager.popViewport();
        });
    }

    private async createItemRender(item: Item, childrenRender: Record<string, ItemRender>): Promise<ItemRender> {
        const { context } = this.game.pipeline;
        const bounds = await this.getItemRenderBounds(item, childrenRender);
        const dimensions = bounds.dimensions();

        const texture = context.createTexture();
        texture.use(() => {
            texture.setImage(null, { width: dimensions.x, height: dimensions.y, internalFormat: 'rgba', format: 'rgba' });
            texture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.ensureSize(dimensions.x, dimensions.y);
        });

        const target = context.createFramebuffer();
        target.use(() => {
            target.attachTexture(texture);
        });

        return {
            bounds,
            target,
            texture,
            update: item.update,
        };
    }

    private async getItemRenderBounds(item: Item, childrenRender: Record<string, ItemRender>): Promise<AABB2> {
        const result = { render: AABB2.ZEROONE };
        await this.attributeRegistry.emit('bounds', item, result, childrenRender);
        return result.render;
    }

    // =========================================================================================
    // Loading
    // =========================================================================================

    private async loadItem(item: Item): Promise<LoadTask[]> {
        // Recursively gather loading tasks
        const existing = this.loadingItems.get(item.id);
        if (existing) {
            // Check children even if parent is loading
            for (const id of item.children) {
                const data = this.items.get(id);
                if (!data) continue;
                const childTasks = await this.loadItem(data);
                if (childTasks.length > 0) return childTasks;
            }
            return existing;
        }

        const tasks: LoadTask[] = [];
        this.loadingItems.set(item.id, tasks);

        await this.attributeRegistry.emit('load', item, {
            create: (options) => {
                const task: LoadTask = {
                    ...options,
                    done: false,
                    resolve: () => {
                        task.done = true;
                        const idx = tasks.indexOf(task);
                        if (idx !== -1) tasks.splice(idx, 1);
                    },
                };
                tasks.push(task);
                return task;
            },
        });

        for (const id of item.children) {
            const data = this.items.get(id);
            if (!data) continue;
            const childTasks = await this.loadItem(data);
            if (childTasks.length > 0) return childTasks;
        }

        return tasks;
    }

    // =========================================================================================
    // Input Handling
    // =========================================================================================

    public async handleInput(pool: ItemPool, options: PoolOptions, event: InputEvent): Promise<void> {
        const isMouse =
            event.kind === 'mouse-move' ||
            event.kind === 'mouse-down' ||
            event.kind === 'mouse-up' ||
            event.kind === 'mouse-enter' ||
            event.kind === 'mouse-leave' ||
            event.kind === 'mouse-wheel';

        if (!isMouse) return;

        const { matrices } = this.game.pipeline;
        const view = matrices.getViewToWorld().multiply(options.transform.inverse());
        const rootEvent: ItemMouseEvent = {
            ...event,
            offset: view.transform2(event.mouse.pos),
            offsetPrev: view.transform2(event.mouse.pos.sub(event.mouse.delta)),
            offsetDelta: view.basisTransform2(event.mouse.delta),
        };

        // Use array copy + reverse iterate to handle Z-order (top items first)
        // Optimization: Use reverse for-loop to avoid allocating .toReversed() array
        const rootItems = Object.values(pool.items);

        // 1. Collision Pass (Mouse Move Only)
        if (event.kind === 'mouse-move') {
            this.states.hovered = undefined;
            if (this.states.held) {
                const heldItem = pool.items[this.states.held];
                if (!heldItem) {
                    this.states.held = undefined;
                }
            }
            for (let i = rootItems.length - 1; i >= 0; i--) {
                const data = this.items.get(rootItems[i].id);
                if (data && !data.parent) {
                    await this.traverseCollision(data, pool, rootEvent);
                }
            }
        }

        if (this.states.hovered === this.states.held) {
            this.states.hovered = undefined;
        }

        // 2. Event Dispatch Pass
        for (let i = rootItems.length - 1; i >= 0; i--) {
            const data = this.items.get(rootItems[i].id);
            if (data && !data.parent) {
                await this.traverseDispatch(data, pool, rootEvent);
            }
        }

        // 3. Actions Collection Pass
        this.actions.length = 0;
        for (let i = rootItems.length - 1; i >= 0; i--) {
            const data = this.items.get(rootItems[i].id);
            if (data && !data.parent) {
                await this.traverseActions(data, pool, rootEvent);
            }
        }
    }

    private async traverseDispatch(item: Item, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        // Iterate children in reverse Z-order
        const children = item.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = this.items.get(children[i]);
            if (child) {
                this.traverseDispatch(child, pool, localEvent);
            }
        }

        await this.attributeRegistry.emit('mouse', item, pool, localEvent);
    }

    private async traverseCollision(item: Item, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        const children = item.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = this.items.get(children[i]);
            if (child) {
                this.traverseCollision(child, pool, localEvent);
            }
        }

        await this.attributeRegistry.emit('collide', item, pool, localEvent);
    }

    private async traverseActions(item: Item, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        const children = item.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = this.items.get(children[i]);
            if (child) {
                this.traverseActions(child, pool, localEvent);
            }
        }

        await this.attributeRegistry.emit('actions', item, pool, localEvent, { actions: this.actions });
    }

    /**
     * Calculates the event coordinates relative to the current item's transform.
     */
    private toLocalEvent(item: Item, parentEvent: ItemMouseEvent): ItemMouseEvent {
        const transform = getTransform(item.transform);
        // Optimize: Compute inverse once if possible, but affineInverse is usually fast enough
        const inverse = transform.affineInverse();

        return {
            ...parentEvent,
            offset: inverse.xform(parentEvent.offset),
            offsetPrev: inverse.xform(parentEvent.offsetPrev),
            offsetDelta: transform.basisXForm(parentEvent.offsetDelta),
        };
    }
}
