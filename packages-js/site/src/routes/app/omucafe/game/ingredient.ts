import type { Asset } from './asset.js';
import type { Behaviors } from './behavior.js';
import { createTransform, type Bounds, type Transform } from './transform.js';

export type Ingredient = {
    id: string,
    name: string,
    image?: Asset,
    transform: Transform,
    behaviors: Partial<Behaviors>,
    bounds: Bounds,
};

export function createIngredient(id: string, name: string): Ingredient {
    return {
        id,
        name,
        transform: createTransform(),
        behaviors: {},
        bounds: {
            min: { x: 0, y: 0 },
            max: { x: 1, y: 1 },
        },
    };
}
