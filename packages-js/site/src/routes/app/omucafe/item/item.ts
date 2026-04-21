import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2, type AABB2Like } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import type { Transform2D } from '$lib/math/transform2d';
import type { Vec2Like } from '$lib/math/vec2';
import { Game } from '../core/game';
import type { BufferedMap } from '../core/game-state';
import { clone, generateUid, type ValidateResult } from '../core/helper';
import type { Action } from '../core/input-system';
import { getTransform, validateTransform, type Transform } from '../core/transform';
import type { AttributeKey, Attributes } from './attribute';
import type { ActionContext, CollideContext, ItemMouseEvent, ItemRender, LoadTask } from './attribute-handler';

// --- Interfaces ---
// (インターフェースの変更はありません)
export interface Item {
    readonly id: string;
    attrs: Attributes;
    name: string;
    transform: Transform;
    children: string[];
    tags: string[];
    update: number;
    parent?: string;
    pool: string;
}

export interface ItemRef {
    readonly id: string;
}

export interface ItemPool {
    id: string;
    items: Record<string, ItemRef>;
    // Sound Effects
    soundEffects?: Record<string, string>;
}

export interface ItemSystemState {
    hovered?: string;
    held?: string;
}

export interface PoolOptions {
    pool: ItemPool;
    name: string;
    transform: Transform;
    bounds: AABB2Like;
    align?: Vec2Like;
    ordering: 'upper' | 'lower' | 'latest';
}

export interface PoolInputPass {
    hovered?: string;
    actions: Action[];
}

export function validateItem(item: Item): ValidateResult<Item> {
    const game = Game.getInstance();
    const attributeMap = game.attribute.values;
    if (typeof item.name !== 'string') {
        return { type: 'invalid', message: 'nameは文字列でなければなりません' };
    }
    const transformResult = validateTransform(item.transform);
    if (transformResult.type === 'invalid') {
        return { type: 'invalid', message: `transformが無効: ${transformResult.message}` };
    }
    if (!Array.isArray(item.children)) {
        return { type: 'invalid', message: 'childrenは配列でなければなりません' };
    }
    if (item.children.some(childId => typeof childId !== 'string')) {
        return { type: 'invalid', message: 'childrenの要素はすべて文字列でなければなりません' };
    }
    if (item.tags === undefined) {
        item.tags = [];
    }
    if (!Array.isArray(item.tags)) {
        return { type: 'invalid', message: 'tagsは配列でなければなりません' };
    }
    if (item.tags.some(tag => typeof tag !== 'string')) {
        return { type: 'invalid', message: 'tagsの要素はすべて文字列でなければなりません' };
    }
    if (typeof item.pool !== 'string') {
        return { type: 'invalid', message: 'poolは文字列でなければなりません' };
    }
    if (typeof item.update !== 'number') {
        return { type: 'invalid', message: 'updateは数値でなければなりません' };
    }
    // Attributeのバリデーション
    for (const [attrName, attrValue] of Object.entries(item.attrs)) {
        const handler = attributeMap[attrName as AttributeKey];
        if (!handler) {
            return { type: 'invalid', message: `不明な属性: ${attrName}` };
        }
        // @ts-expect-error Union vs Intersection
        const handlerResult = handler.validate(attrValue);
        if (handlerResult.type === 'invalid') {
            return { type: 'invalid', message: `属性${attrName}が無効: ${handlerResult.message}` };
        }
    }
    return { type: 'valid', value: item };
}

// --- System ---
export class ItemSystem {
    public readonly name = 'ItemSystem';

    public readonly items: BufferedMap<Item>;

    private itemCounter = 0;
    private loadingItems: Map<string, LoadTask> = new Map();
    private inputPass: PoolInputPass | undefined;

    constructor(private readonly game: Game) {
        this.items = game.states.items;
        this.garbageCollection();
    }

    private get renderPass() {
        const pass = this.game.itemRenderer.renderPass;
        if (!pass) throw new Error('Render pass is not set.');
        return pass;
    }

    public get states() {
        return this.game.states.itemStates.value;
    }

    private garbageCollection() {
        const registryString = this.game.states.getAllJsonStringified(this.game.states.items);

        const activeItems: Item[] = [];
        for (const [id, item] of this.items.entries()) {
            if (registryString.includes(id)) {
                activeItems.push(item);
            }
        }

        const toKeep: Map<string, Item> = new Map();
        const deletedItems: string[] = [];
        while (activeItems.length > 0) {
            const item = activeItems.pop();
            if (!item) continue;

            const toRemove: string[] = [];
            for (const childId of item.children) {
                const child = this.items.get(childId);
                if (toKeep.has(childId)) continue;
                if (!child || child.parent !== item.id) {
                    toRemove.push(childId);
                    continue;
                }
                activeItems.push(child);
            }

            for (const id of toRemove) {
                const idx = item.children.indexOf(id);
                if (idx !== -1) item.children.splice(idx, 1);
                this.items.delete(id);
                deletedItems.push(id);
            }
            toKeep.set(item.id, item);
        }

        for (const id of this.items.keys()) {
            if (!toKeep.has(id)) {
                this.items.delete(id);
                deletedItems.push(id);
            }
        }

        if (deletedItems.length > 0) {
            console.log(`Garbage collected ${deletedItems.length} items:`, deletedItems);
        }
    }

    // =========================================================================================
    // Lifecycle & Allocation
    // =========================================================================================

    public allocateItem(item: Omit<Item, 'id' | 'update'>): Item {
        const id = generateUid();
        const allocItem: Item = {
            ...clone(item),
            id,
            update: 0,
        };
        this.items.set(id, allocItem);
        return allocItem;
    }

    public clone(item: Item): Item {
        const poolOptions = this.renderPass.pools[item.pool];
        const clonedItem = this.allocateItem({
            ...item,
            children: [],
        });
        poolOptions.pool.items[clonedItem.id] = { id: clonedItem.id };

        for (const childId of item.children) {
            const data = this.get(childId);
            if (!data) continue;
            const childClone = this.clone(data);
            childClone.parent = clonedItem.id;
            clonedItem.children.push(childClone.id);
        }

        this.setPool(clonedItem, poolOptions.pool);
        return clonedItem;
    }

    public remove(item: Item): void {
        const pool = this.renderPass.pools[item.pool];
        for (const childId of item.children) {
            const child = this.get(childId);
            if (!child) continue;
            this.remove(child);
        }
        delete pool.pool.items[item.id];
        this.game.itemRenderer.deleteItemRender(item.id);
    }

    public get(id: string) {
        return this.items.get(id);
    }

    // =========================================================================================
    // Rendering
    // =========================================================================================

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
        item.update++;
        if (item.parent) {
            const parent = this.items.get(item.parent);
            if (!parent) {
                item.parent = undefined;
                return;
            }
            this.updateItem(parent);
        }
    }

    public getParents(item: Item): Item[] {
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

    public isItemGrandchildOf(item: Item, ancestorId: string): boolean {
        const parents = this.getParents(item);
        return parents.some(parent => parent.id === ancestorId);
    }

    public dettachItem(item: Item) {
        if (!item.parent) return;

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

    public attachItem(parent: Item, child: Item) {
        if (parent.id === child.id) throw new Error('Cannot attach item to itself');

        const parents = this.getParents(parent);
        if (parents.some(p => p.id === child.id)) {
            throw new Error('Cannot attach item to its descendant');
        }

        const oldPool = this.renderPass.pools[parent.pool];
        if (!oldPool) throw new Error(`Pool ${parent.pool} not found.`);

        this.setPool(child, oldPool.pool);

        const containerTransform = this.game.item.getWorldTransform(parent);
        const itemTransform = this.game.item.getWorldTransform(child);
        const worldToContainerTransform = containerTransform.affineInverse();
        const transformInContainer = worldToContainerTransform.multiply(itemTransform);

        child.transform = transformInContainer.toJSON();
        child.parent = parent.id;
        parent.children = [...parent.children, child.id];

        this.updateItem(child);
    }

    // =========================================================================================
    // Loading
    // =========================================================================================

    public async loadItem(item: Item): Promise<LoadTask[]> {
        const existing = this.loadingItems.get(item.id);
        if (existing && existing.update === item.update) {
            for (const id of item.children) {
                const data = this.items.get(id);
                if (!data) continue;
                const childTasks = await this.loadItem(data);
                if (childTasks.length > 0) return childTasks;
            }
            return existing.dependencies;
        }

        const dependencies: LoadTask[] = [];
        const task: LoadTask = {
            title: `Loading ${item.id}`,
            done: false,
            update: item.update,
            dependencies,
            resolve: () => {},
        };
        this.loadingItems.set(item.id, task);

        await this.game.attribute.emit('load', item, {
            create: (options) => {
                const subTask: LoadTask = {
                    ...options,
                    done: false,
                    update: item.update,
                    dependencies: [],
                    resolve: () => {
                        subTask.done = true;
                        const idx = dependencies.indexOf(subTask);
                        if (idx !== -1) dependencies.splice(idx, 1);
                        if (dependencies.length === 0) task.done = true;
                    },
                };
                dependencies.push(subTask);
                return subTask;
            },
        });

        for (const id of item.children) {
            const data = this.items.get(id);
            if (!data) continue;
            const childTasks = await this.loadItem(data);
            if (childTasks.length > 0) return childTasks;
        }

        return dependencies;
    }

    // =========================================================================================
    // Input Handling
    // =========================================================================================

    public initPass() {
        this.inputPass = undefined;
    }

    public endInput() {
        if (!this.inputPass) return;
        this.game.input.add(...this.inputPass.actions);

        if (!this.inputPass.hovered) {
            this.states.hovered = undefined;
        }

        if (this.states.held && !this.items.has(this.states.held)) {
            this.states.held = undefined;
        }
    }

    public async handleMouse(pool: ItemPool, options: PoolOptions, event: InputEvent) {
        const isMouse =
            event.kind === 'mouse-move' ||
            event.kind === 'mouse-down' ||
            event.kind === 'mouse-up' ||
            event.kind === 'mouse-enter' ||
            event.kind === 'mouse-leave' ||
            event.kind === 'mouse-wheel';

        if (!isMouse) return;

        const { matrices } = this.game.pipeline;
        const view = getTransform(options.transform).getMat4().inverse().multiply(matrices.getViewToWorld());

        const localPos = view.transform2(event.mouse.pos);
        const localPrev = view.transform2(event.mouse.pos.sub(event.mouse.delta));
        const localDelta = view.basisTransform2(event.mouse.delta);

        const rootEvent: ItemMouseEvent = {
            ...event,
            localPos,
            localPrev,
            localDelta,
            poolPos: localPos,
            poolPrev: localPrev,
            poolDelta: localDelta,
        };

        const rootItems = Object.values(pool.items);
        this.inputPass ??= { actions: [] };

        // 1. Collision Pass
        const ctx: CollideContext = {};
        for (let i = rootItems.length - 1; i >= 0; i--) {
            const data = this.items.get(rootItems[i].id);
            if (data && !data.parent) {
                await this.traverseCollision(data, pool, rootEvent, ctx);
            }
        }

        if (ctx.hovered) {
            this.states.hovered = ctx.hovered;
            this.inputPass.hovered = ctx.hovered;
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
        const actionContext: ActionContext = { actions: this.inputPass.actions };
        for (let i = rootItems.length - 1; i >= 0; i--) {
            const data = this.items.get(rootItems[i].id);
            if (data && !data.parent) {
                await this.traverseActions(data, pool, rootEvent, actionContext);
            }
        }

        this.processHeldItemBounds(pool, options, rootEvent.localPos);
    }

    /**
     * heldアイテムに対する境界計算アクションを構築・登録します。
     * handleMouseが肥大化しないように分離しました。
     */
    private processHeldItemBounds(pool: ItemPool, options: PoolOptions, localPos: Vec2Like) {
        const isInBound = AABB2.from(options.bounds).contains(localPos);
        if (!isInBound || !this.states.held || !this.game.itemRenderer.renderPass) return;

        const scene = this.game.states.scene.value;
        const held = this.items.get(this.states.held);
        if (!held) return;

        if (scene.type !== 'factory' && pool.id === 'fridge') {
            this.inputPass!.actions.push({
                title: '戻す',
                priority: 0,
                invoke: async () => {
                    await this.dropItem();
                    this.remove(held);
                },
            });
            return;
        }

        this.inputPass!.actions.push({
            title: `${options.name}に置く`,
            priority: pool.id === 'export' ? 1000 : 0,
            invoke: async () => {
                await this.dropItem();
                this.setPool(held, pool);
                const render = await this.game.itemRenderer.getItemRender(held);
                const transform = getTransform(held.transform);
                if (render.type === 'rendered') {
                    this.constrainItemToBounds(held, options, transform.getMat4().basisTransformAABB2(render.render.bounds));
                }
                await this.reorderItems(pool, options.ordering);
            },
        });
    }

    public async holdItem(item: Item) {
        this.states.held = item.id;
        const poolOptions = this.renderPass.pools[item.pool];
        for (const entry of this.traverseHierarchy(item)) {
            await this.game.attribute.emit('drag', entry, poolOptions.pool);
        }
    }

    public async dropItem() {
        const heldId = this.states.held;
        if (!heldId) return;
        const held = this.get(heldId);
        if (!held) return;
        const poolOptions = this.renderPass.pools[held.pool];
        this.states.held = undefined;
        for (const entry of this.traverseHierarchy(held)) {
            await this.game.attribute.emit('drop', entry, poolOptions.pool);
        }
    }

    private async reorderItems(pool: ItemPool, ordering: PoolOptions['ordering']) {
        if (!ordering) return;
        if (ordering === 'latest') return;
        const items = Object.values(pool.items)
            .map(({ id }) => this.game.item.items.get(id))
            .filter((child): child is Item => !!child);

        const renderData: Record<string, ItemRender> = {};
        for (const child of items) {
            const renderState = await this.game.itemRenderer.getItemRender(child);
            if (renderState.type === 'rendered') {
                renderData[child.id] = renderState.render;
            }
        }

        items.sort((a, b) => {
            const aBounds = renderData[a.id]?.bounds;
            const bBounds = renderData[b.id]?.bounds;

            if (!aBounds || !bBounds) return 0; // 描画データがない場合は順序を変えない

            const aCenterY = a.transform.offset.y + aBounds.max.y;
            const bCenterY = b.transform.offset.y + bBounds.max.y;

            const delta = (bCenterY - aCenterY);
            return ordering === 'lower' ? -delta : delta;
        });

        pool.items = {};
        for (const item of items) {
            pool.items[item.id] = { id: item.id };
        }
    }

    /**
     * アイテムをプールの境界内に収めるための座標計算を行います。
     */
    private constrainItemToBounds(item: Item, options: PoolOptions, itemBounds: AABB2) {
        if (!options.align) return;
        const poolAABB = AABB2.from(options.bounds);
        const dimensions = poolAABB.size;
        const size = itemBounds.size;

        const exceededLeft = poolAABB.min.x - itemBounds.min.x - item.transform.offset.x;
        const exceededRight = itemBounds.max.x + item.transform.offset.x - poolAABB.max.x;
        const exceededTop = poolAABB.min.y - itemBounds.min.y - item.transform.offset.y;
        const exceededBottom = itemBounds.max.y + item.transform.offset.y - poolAABB.max.y;

        if (dimensions.x < size.x) {
            item.transform.offset.x = lerp(poolAABB.min.x - itemBounds.min.x, poolAABB.max.x - itemBounds.max.x, options.align.x);
        } else {
            if (exceededLeft > 0 && options.align.x <= 0.5) item.transform.offset.x += exceededLeft;
            if (exceededRight > 0 && options.align.x >= 0.5) item.transform.offset.x -= exceededRight;
        }

        if (dimensions.y < size.y) {
            item.transform.offset.y = lerp(poolAABB.min.y - itemBounds.min.y, poolAABB.max.y - itemBounds.max.y, options.align.y);
        } else {
            if (exceededTop > 0 && options.align.y <= 0.5) item.transform.offset.y += exceededTop;
            if (exceededBottom > 0 && options.align.y >= 0.5) item.transform.offset.y -= exceededBottom;
        }
    }

    public setPool(item: Item, pool: ItemPool) {
        const oldPool = this.renderPass.pools[item.pool];
        const newPool = this.renderPass.pools[pool.id];

        if (!oldPool) throw new Error(`Pool ${item.pool} not found.`);
        if (!newPool) throw new Error(`Pool ${pool.id} not found.`);

        if (!item.parent) {
            const poolToGlobalTransform = getTransform(oldPool.transform);
            const globalToNewTransform = getTransform(newPool.transform).affineInverse();
            const oldTransform = getTransform(item.transform);
            const newTransform = globalToNewTransform.multiply(poolToGlobalTransform.multiply(oldTransform));
            item.transform = newTransform.toJSON();
        }

        delete oldPool.pool.items[item.id];
        pool.items[item.id] = { id: item.id };
        item.pool = pool.id;

        for (const child of item.children) {
            const data = this.items.get(child);
            if (!data) continue;
            this.setPool(data, pool);
        }
    }

    public *traverseHierarchy(item: Item): Generator<Item> {
        yield item;
        for (const childId of item.children) {
            const child = this.items.get(childId);
            if (child) {
                yield* this.traverseHierarchy(child);
            }
        }
    }

    private async traverseDispatch(item: Item, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        for (let i = item.children.length - 1; i >= 0; i--) {
            const child = this.items.get(item.children[i]);
            if (child) await this.traverseDispatch(child, pool, localEvent);
        }

        await this.game.attribute.emit('mouse', item, pool, localEvent);
    }

    private async traverseCollision(item: Item, pool: ItemPool, event: ItemMouseEvent, ctx: CollideContext): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        for (let i = item.children.length - 1; i >= 0; i--) {
        // for (let i = 0; i < item.children.length; i++) {
            const child = this.items.get(item.children[i]);
            if (child) await this.traverseCollision(child, pool, localEvent, ctx);
        }

        await this.game.attribute.emit('collide', item, pool, localEvent, ctx);
    }

    private async traverseActions(item: Item, pool: ItemPool, event: ItemMouseEvent, ctx: ActionContext): Promise<void> {
        const localEvent = this.toLocalEvent(item, event);

        for (let i = item.children.length - 1; i >= 0; i--) {
            const child = this.items.get(item.children[i]);
            if (child) await this.traverseActions(child, pool, localEvent, ctx);
        }

        await this.game.attribute.emit('actions', item, pool, localEvent, ctx);
    }

    private toLocalEvent(item: Item, parentEvent: ItemMouseEvent): ItemMouseEvent {
        const transform = getTransform(item.transform);
        const inverse = transform.affineInverse();

        return {
            ...parentEvent,
            localPos: inverse.xform(parentEvent.localPos),
            localPrev: inverse.xform(parentEvent.localPrev),
            localDelta: transform.basisXForm(parentEvent.localDelta),
        };
    }
}
