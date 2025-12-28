import type { InputEvent } from '$lib/components/canvas/pipeline';
import type { Game } from '../core/game';
import type { BufferedMap } from '../core/game-state';
import { type Transform } from '../core/transform';
import type { Attributes } from './attribute';
import { AttributeRegistry } from './attribute-registry';

export interface Item {
    readonly id: string;
    readonly attrs: Attributes;
    transform: Transform;
}

export interface ItemRef {
    readonly id: string;
}

export interface ItemPool {
    items: Record<string, ItemRef>;
    hovered?: string;
}

export class ItemSystem {
    private attributeRegistry: AttributeRegistry;
    private items: BufferedMap<Item>;
    private itemCounter = 0;

    name = 'ItemSystem';

    constructor(
        private readonly game: Game,
    ) {
        this.items = game.states.items;
        this.attributeRegistry = AttributeRegistry.new(game);
    }

    private generateUid() {
        const count = this.itemCounter++;
        const timestamp = Date.now() - 946684800000;
        return (timestamp + count).toString(36);
    }

    public allocateItem(item: Omit<Item, 'id'>): Item {
        const id = this.generateUid();
        const allocItem: Item = {
            ...item,
            id,
        };
        this.items.set(id, allocItem);
        return allocItem;
    }

    public async renderPool(pool: ItemPool) {
        const { draw, matrices } = this.game.pipeline;
        for (const { id } of Object.values(pool.items)) {
            const data = this.items.get(id);
            if (!data) continue;
            this.attributeRegistry.emit('render', data);
        }
    }

    public async handleInput(pool: ItemPool, event: InputEvent) {
        if (event.kind === 'mouse-move') {
            for (const { id } of Object.values(pool.items)) {
                const data = this.items.get(id);
                if (!data) continue;
                this.attributeRegistry.emit('collide', data, event.mouse.pos);
            }
        }
    }

    private async updatePool(pool: ItemPool) {
        const { input } = this.game.pipeline;
    }
}
