import type { Asset } from './asset.js';
import type { Behaviors } from './behavior.js';
import type { Effect } from './effect.js';
import { uniqueId } from './helper.js';
import { createTransform, type Bounds, type Transform } from './transform.js';

export type Item = {
    id: string,
    name: string,
    image?: Asset,
    transform: Transform,
    behaviors: Partial<Behaviors>,
    effects: Record<string, Effect>,
    bounds: Bounds,
};

export function createItem(options: {
    id?: string,
    name: string,
    image?: Asset,
    transform?: Transform,
    behaviors?: Partial<Behaviors>,
    bounds?: Bounds,
}): Item {
    const { id, name, image, transform, behaviors, bounds } = options;
    return {
        id: id ?? uniqueId(),
        name,
        image,
        transform: transform ?? createTransform(),
        behaviors: behaviors ?? {},
        effects: {},
        bounds: bounds ?? {
            min: { x: 0, y: 0 },
            max: { x: 1, y: 1 },
        },
    };
}
