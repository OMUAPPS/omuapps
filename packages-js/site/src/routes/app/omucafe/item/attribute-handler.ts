import type { Vec2 } from '$lib/math/vec2';
import type { Item, ItemPool } from './item';

export interface AttributeInvoke<Attr> {
    attr: Attr;
    item: Item;
    pool: ItemPool;
}

export interface AttributeHandler<T> {
    render(args: AttributeInvoke<T>): Promise<void>;
    collide(args: AttributeInvoke<T>, mouse: Vec2): Promise<void>;
}
