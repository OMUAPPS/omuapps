import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AttributeHandler, AttributeInvoke } from '../attribute-handler';

export interface AttrImage {
    asset: Asset;
}

export class AttributeImage implements AttributeHandler<AttrImage> {
    constructor(
        private readonly game: Game,
    ) {}

    async collide({ attr }: AttributeInvoke<AttrImage>) {
    }

    async render({ attr }: AttributeInvoke<AttrImage>): Promise<void> {
        const { draw } = this.game.pipeline;
        const { asset } = attr;
        const assetState = await this.game.assetManager.getTexture(asset);
        if (assetState.type === 'ready') {
            const { texture } = assetState;
            const { width, height } = texture;
            draw.texture(0, 0, width, height, texture);
        }
    }
}
