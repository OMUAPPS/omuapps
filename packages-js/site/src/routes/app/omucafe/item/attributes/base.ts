import type { Game } from '../../core/game';
import type { AttributeHandler, AttributeInvoke, ItemRender } from '../attribute-handler';

export type AttrBase = undefined;

export class AttributeBase implements AttributeHandler<AttrBase> {
    constructor(
        private readonly game: Game,
    ) {}

    async renderChildren(invoke: AttributeInvoke<undefined>, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {

    }
}
