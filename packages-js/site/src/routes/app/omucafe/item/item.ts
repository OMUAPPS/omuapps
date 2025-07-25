import type { Asset } from '../asset/asset.js';
import { copy, uniqueId } from '../game/helper.js';
import { createTransform, type Bounds, type Transform } from '../game/transform.js';
import type { Behaviors } from './behavior.js';

export type Item = {
    id: string,
    name: string,
    image?: Asset,
    transform: Transform,
    behaviors: Partial<Behaviors>,
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
    return copy({
        id: id ?? uniqueId(),
        name,
        image,
        transform: transform ?? createTransform(),
        behaviors: behaviors ?? {},
        bounds: bounds ?? {
            min: { x: 0, y: 0 },
            max: { x: 1, y: 1 },
        },
    });
}
