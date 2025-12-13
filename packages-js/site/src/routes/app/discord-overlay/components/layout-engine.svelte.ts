import { Vec2, type Vec2Like } from '$lib/math/vec2';
import type { AlignSide, Config } from '../discord-overlay-app';

const AVATAR_DEFAULT_SPACING = 300;

export class LayoutEngine {
    private alignDistances: Record<string, number> = {};

    constructor(
        private config: Config,
        private dimensions: Vec2,
    ) {}

    public getAlignPerpendicularOffset(align: Vec2Like): Vec2 {
        return Vec2.from(align).turnRight().scale(align.x > 0 || align.y < 0 ? -1 : 1);
    }

    public calculateAlignDir(alignSide: AlignSide): Vec2 {
        const { align, side } = alignSide;
        const horizontal = align.y === 0;
        return new Vec2(
            horizontal ? 0 : (side === 'start' ? 1 : -1),
            horizontal ? (side === 'end' ? -1 : 1) : 0,
        );
    }

    public calculateAlignPosition(alignSide: AlignSide, index: number, total: number): Vec2 {
        const MARGIN = this.config.align.margin;
        const { align, side } = alignSide;
        const align01 = Vec2.from(align).add(Vec2.ONE).mul({ x: this.dimensions.x / 2 - MARGIN, y: this.dimensions.y / 2 - MARGIN }).add({ x: MARGIN, y: MARGIN });
        const dirPerp = this.getAlignPerpendicularOffset(align);
        const sideScalar = { start: -1, middle: 0, end: 1 }[side];
        const origin = align01.add(dirPerp.scale(Math.abs(align.x) > Math.abs(align.y) ? this.dimensions.y / 2 : this.dimensions.x / 2).scale(sideScalar));

        const spacing = Math.min(this.config.align.spacing, (this.dimensions.x - MARGIN * 2) / total);
        let offsetScale = index * spacing + MARGIN * 2;
        if (side === 'middle') {
            offsetScale = (index - (total - 1) / 2) * spacing;
        }
        const offsetDir = this.calculateAlignDir(alignSide);
        const offset = offsetDir.scale(offsetScale);
        return origin.add(offset);
    }

    public getFitScaleFactor(): number {
        const MARGIN = this.config.align.margin;
        const total = Object.keys(this.alignDistances).length;
        const spacing = this.config.align.spacing / Math.min(this.config.align.spacing, (this.dimensions.x - MARGIN * 2) / total);
        return spacing;
    }
}
