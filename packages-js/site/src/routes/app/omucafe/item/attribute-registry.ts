import type { Game } from '../core/game';
import type { Attributes } from './attribute';
import type { AttributeHandler } from './attribute-handler';
import { AttributeDragging, AttributeImage } from './attributes';
import { AttributeContainer } from './attributes/container';
import type { Item } from './item';

type AttributeHandlerMap = {
    [K in keyof Attributes]: AttributeHandler<Attributes[K]>;
};

type ExcludeFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;
type AsFunction<T> = T extends undefined ? never : (T extends string ? never : T);

export class AttributeRegistry {
    private readonly attributes: AttributeHandlerMap;

    private constructor(
        public readonly image: AttributeImage,
        public readonly dragging: AttributeDragging,
        public readonly container: AttributeContainer,
    ) {
        this.attributes = {
            image,
            dragging,
            container,
        };
    }

    get values() {
        return this.attributes;
    }

    public static new(game: Game) {
        const image = new AttributeImage(game);
        const dragging = new AttributeDragging(game);
        const container = new AttributeContainer(game);
        return new AttributeRegistry(
            image,
            dragging,
            container,
        );
    }

    public async emit<
        K extends keyof AttributeHandler<unknown>,
        Handler extends AsFunction<AttributeHandler<unknown>[K]> = AsFunction<AttributeHandler<unknown>[K]>,
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
    }
}
