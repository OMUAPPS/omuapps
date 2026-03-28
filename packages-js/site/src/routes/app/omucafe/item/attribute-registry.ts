import type { Game } from '../core/game';
import type { Attributes } from './attribute';
import type { AttributeHandler } from './attribute-handler';
import { AttributeDragging, AttributeImage } from './attributes';
import { AttributeBase, type AttrBase } from './attributes/base';
import { AttributeContainer } from './attributes/container';
import type { Item } from './item';

type AttributeHandlerMap = {
    [K in keyof Attributes]: AttributeHandler<Attributes[K]>;
};

type ExcludeFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;
type NonUndefined<T> = T extends undefined ? never : T;

export class AttributeRegistry {
    private constructor(
        private base: AttributeHandler<AttrBase>,
        private readonly attributes: AttributeHandlerMap,
    ) {
    }

    get values() {
        return this.attributes;
    }

    public static new(game: Game) {
        const base = new AttributeBase(game);
        const attrs: AttributeHandlerMap = {
            image: new AttributeImage(game),
            dragging: new AttributeDragging(game),
            container: new AttributeContainer(game),
        };
        return new AttributeRegistry(base, attrs);
    }

    public async emit<
        K extends keyof AttributeHandler<unknown>,
        Handler extends NonUndefined<AttributeHandler<unknown>[K]> = NonUndefined<AttributeHandler<unknown>[K]>,
        Params extends Parameters<Handler> = Parameters<Handler>,
    >(key: K, item: Item, ...args: ExcludeFirst<Params>) {
        for (const attrKey in item.attrs) {
            const attr = attrKey as keyof AttributeHandlerMap;
            const handler = this.attributes[attr];
            if (handler && typeof handler[key] === 'function') {
                const func = handler[key].bind(handler) as AttributeHandler<unknown>[K];
                // @ts-expect-error ts(2556)
                await func({ attr: item.attrs[attr], item }, ...args);
            }
        }
        const handler = this.base;
        if (handler && typeof handler[key] === 'function') {
            const func = handler[key].bind(handler) as AttributeHandler<unknown>[K];
            // @ts-expect-error ts(2556)
            await func({ attr: undefined, item }, ...args);
        }
    }
}
