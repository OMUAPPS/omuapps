import type { Game } from '../core/game';
import type { Attributes } from './attribute';
import type { AttributeHandler } from './attribute-handler';
import { AttributeImage } from './attributes';
import type { Item } from './item';

type AttributeHandlerMap = {
    [K in keyof Attributes]: AttributeHandler<Attributes[K]>;
};

type ExcludeFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;

export class AttributeRegistry {
    private constructor(
        private readonly attributes: AttributeHandlerMap,
    ) {}

    public static new(game: Game) {
        const attrs: AttributeHandlerMap = {
            image: new AttributeImage(game),
        };
        return new AttributeRegistry(attrs);
    }

    public emit<
        K extends keyof AttributeHandler<unknown>,
        Params extends Parameters<AttributeHandler<unknown>[K]> = Parameters<AttributeHandler<unknown>[K]>,
    >(key: K, item: Item, ...args: ExcludeFirst<Params>) {
        for (const attrKey in item.attrs) {
            const attr = attrKey as keyof AttributeHandlerMap;
            const handler = this.attributes[attr];
            if (handler && typeof handler[key] === 'function') {
                const func = handler[key].bind(handler) as AttributeHandler<unknown>[K];
                // @ts-expect-error ts(2556)
                func({ attr: item.attrs[attr], item }, ...args);
            }
        }
    }
}
