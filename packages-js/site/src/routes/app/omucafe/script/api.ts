import { Vec2 } from '$lib/math/vec2.js';
import { getContext, paint } from '../game/game.js';
import { copy } from '../game/helper.js';
import { PAINT_EVENT_TYPE } from '../game/paint.js';
import { Time } from '../game/time.js';
import { transformToMatrix } from '../game/transform.js';
import { createEffect } from '../item/behaviors/effect.js';
import { attachChild, cloneItemState, detachChildren, ITEM_LAYERS, removeItemState } from '../item/item-state.js';
import { getGame } from '../omucafe-app.js';
import { assertValue, builder, Globals, type ScriptContext, type Value } from './script.js';

const functions = {
    log(ctx: ScriptContext, args: Value[]): Value {
        const [message] = args;
        console.log('[log]', message);
        const { globals: { debug } } = getGame();
        debug.log(message);
        const { v } = builder;
        return v.void();
    },
    get_items(ctx: ScriptContext, args: Value[]): Value {
        const kitchen = getContext();        
        const { v } = builder;
        return v.array(...Object.keys(kitchen.items).map(v.string));
    },
    get_children(ctx: ScriptContext, args: Value[]): Value {
        const [itemId] = args;
        assertValue(ctx, itemId, 'string');
        const { v } = builder;
        const item = getContext().items[itemId.value];
        return v.array(...item.children.map(v.string));
    },
    remove_item(ctx: ScriptContext, args: Value[]): Value {
        const { v } = builder;
        const [itemId] = args;
        assertValue(ctx, itemId, 'string');
        const item = getContext().items[itemId.value];
        removeItemState(item);
        return v.void();
    },
    set_held_item(ctx: ScriptContext, args: Value[]): Value {
        const { v } = builder;
        const [itemId] = args;
        const context = getContext();
        if (itemId.type === 'string') {
            const item = context.items[itemId.value];
            const parent = item.parent ? context.items[item.parent] : null;
            if (parent) {
                detachChildren(parent, item);
            }
            context.held = itemId.value;
        } else {
            context.held = null;
        }
        return v.void();
    },
    set_item_parent(ctx: ScriptContext, args: Value[]): Value {
        const { v } = builder;
        const [itemId, parentId] = args;
        assertValue(ctx, itemId, 'string');
        assertValue(ctx, parentId, 'string');
        const context = getContext();
        const item = context.items[itemId.value];
        const parent = context.items[parentId.value];
        attachChild(parent, item);
        if (context.held === itemId.value) {
            context.held = null;
        }
        return v.void();
    },
    create_effect(ctx: ScriptContext, args: Value[]): Value {
        const [itemId, effectId] = args;
        assertValue(ctx, itemId, 'string');
        assertValue(ctx, effectId, 'string');
        const { v } = builder;
        const config = getContext().config;
        const item = getContext().items[itemId.value];
        const effect = config.effects[effectId.value];
        effect.startTime = Time.now();
        item.behaviors.effect ??= createEffect();
        item.behaviors.effect.effects[effect.id] = copy(effect);
        return v.void();
    },
    remove_effect(ctx: ScriptContext, args: Value[]): Value {
        const [itemId, effectId] = args;
        assertValue(ctx, itemId, 'string');
        assertValue(ctx, effectId, 'string');
        const item = getContext().items[itemId.value];
        item.behaviors.effect ??= createEffect();
        delete item.behaviors.effect.effects[effectId.value];
        const { v } = builder;
        return v.void();
    },
    complete(ctx: ScriptContext, args: Value[]): Value {
        const { v } = builder;
        const { globals: { debug }, scene } = getGame();
        const [itemsValue] = args;
        paint.emit({
            t: PAINT_EVENT_TYPE.CLEAR,
        });
        assertValue(ctx, itemsValue, 'array');
        const { items } = getContext();
        const itemIds = itemsValue.items.map((id) => {
            assertValue(ctx, id, 'string');
            return id.value;
        })
        for (const item of Object.values(items)) {
            if (item.parent) continue;
            if (item.layer !== ITEM_LAYERS.PHOTO_MODE) continue;
            removeItemState(item);
        }
        let i = 0;
        for (const itemId of itemIds) {
            const item = items[itemId];
            if (!item) {
                debug.log(v.string(`Item with id ${itemId} not found`));
                continue;
            }
            const transform = transformToMatrix(item.transform);
            const { min, max } = item.bounds;
            const offset = new Vec2(
                (min.x + max.x) / 2,
                (min.y + max.y) / 2,
            ).mul({
                x: transform.m00,
                y: transform.m11,
            });
            cloneItemState(item, {
                layer: ITEM_LAYERS.PHOTO_MODE,
                transform: {
                    right: item.transform.right,
                    up: item.transform.up,
                    offset: {
                        x: -offset.x + (i / (itemIds.length) - 0.5) * 1000,
                        y: -offset.y + 150,
                    },
                }
            });
            i ++;
        }
        scene.set({
            type: 'photo_mode',
            time: Time.now(),
            items: [...itemIds],
        });
        return v.void();
    },
}

export const scriptAPI = new Globals();
scriptAPI.registerFunction('log', [
    {name: 'message'},
], functions.log);
scriptAPI.registerFunction('get_items', [
], functions.get_items);
scriptAPI.registerFunction('get_children', [
    {name: 'itemId', type: 'string'},
], functions.get_children);
scriptAPI.registerFunction('remove_item', [
    {name: 'itemId', type: 'string'},
], functions.remove_item);
scriptAPI.registerFunction('set_held_item', [
    {name: 'itemId'}
], functions.set_held_item);
scriptAPI.registerFunction('set_item_parent', [
    {name: 'itemId', type: 'string'},
    {name: 'parentId', type: 'string'},
], functions.set_item_parent);
scriptAPI.registerFunction('create_effect', [
    {name: 'itemId', type: 'string'},
    {name: 'effectId', type: 'string'},
], functions.create_effect);
scriptAPI.registerFunction('remove_effect', [
    {name: 'itemId', type: 'string'},
    {name: 'effectId', type: 'string'},
], functions.remove_effect);
scriptAPI.registerFunction('complete', [
    {name: 'items', type: 'array'},
], functions.complete);
