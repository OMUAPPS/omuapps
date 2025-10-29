import type { Asset } from '../asset/asset.js';

export type Recipe = {
    ingredients: Record<string, {
        amount: number;
    }>;
    steps: {
        image: Asset;
        text: string;
    }[];
};

export type Product = {
    id: string;
    name: string;
    description?: string;
    image?: Asset;
    recipe: Recipe;
};
