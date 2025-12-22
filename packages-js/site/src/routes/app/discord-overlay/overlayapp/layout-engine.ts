import { comparator } from '$lib/helper';
import { BetterMath } from '$lib/math';
import { AABB2 } from '$lib/math/aabb2';
import { Axis } from '$lib/math/axis';
import type { Mat4 } from '$lib/math/mat4';
import { TAU } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { get } from 'svelte/store';
import { PALETTE_RGB } from '../consts';
import type { AlignSide, UserConfig } from '../discord-overlay-app';
import type { VoiceStateItem } from '../discord/type';
import { alignClear, alignSide, avatarPositions, dragPosition, dragState } from '../states';
import type { AppRenderer } from './app-renderer';

// --- Types & Constants ---

type AlignType = {
    dir: Vec2;
    name: string;
    icon: string;
    iconStart: string;
    iconEnd: string;
};

type Side = 'start' | 'middle' | 'end';

type ClosestInfo = {
    align: AlignType;
    side: Side;
    icon: string;
    dist: number;
    pos: Vec2;
};

const ALIGNS: AlignType[] = [
    { dir: Vec2.LEFT, name: '左', icon: '\uec89', iconStart: '\uec8b', iconEnd: '\uec88' },
    { dir: Vec2.RIGHT, name: '右', icon: '\uec8a', iconStart: '\uec8b', iconEnd: '\uec88' },
    { dir: Vec2.DOWN, name: '上', icon: '\uec8b', iconStart: '\uec89', iconEnd: '\uec8a' },
    { dir: Vec2.UP, name: '下', icon: '\uec88', iconStart: '\uec89', iconEnd: '\uec8a' },
];

const ALIGN_MARGIN = 300;
const OUTLINE_WIDTH = 2;
const TOOLTIP_ARROW_SCALE = 5;

export class LayoutEngine {
    public static AVATAR_FACE_RADIUS = 150;
    public static POSITION_OFFSET = this.AVATAR_FACE_RADIUS / 2;
    private radius = 24;
    private radiusVec = new Vec2(this.radius, this.radius);
    private hoveredAlign: string | undefined = undefined;

    private alignDistances: Record<string, number> = {};
    private alignDistanceCache: Record<string, number> = {};

    constructor(
        private app: AppRenderer,
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
        const MARGIN = this.app.config.align.margin;
        const { align, side } = alignSide;
        const align01 = Vec2.from(align).add(Vec2.ONE).mul({ x: this.app.dimensions.x / 2 - MARGIN, y: this.app.dimensions.y / 2 - MARGIN }).add({ x: MARGIN, y: MARGIN });
        const dirPerp = this.getAlignPerpendicularOffset(align);
        const sideScalar = { start: -1, middle: 0, end: 1 }[side];
        const origin = align01.add(dirPerp.scale(Math.abs(align.x) > Math.abs(align.y) ? this.app.dimensions.y / 2 : this.app.dimensions.x / 2).scale(sideScalar));

        const spacing = Math.min(this.app.config.align.spacing, (this.app.dimensions.x - MARGIN * 2) / total);
        let offsetScale = index * spacing + MARGIN * 2;
        if (side === 'middle') {
            offsetScale = (index - (total - 1) / 2) * spacing;
        }
        const offsetDir = this.calculateAlignDir(alignSide);
        const offset = offsetDir.scale(offsetScale);
        return origin.add(offset);
    }

    public getFitScaleFactor(): number {
        const MARGIN = this.app.config.align.margin;
        const total = Object.keys(this.alignDistances).length;
        const spacing = this.app.config.align.spacing / Math.min(this.app.config.align.spacing, (this.app.dimensions.x - MARGIN * 2) / total);
        return spacing;
    }

    public applyUserTransform(id: string, user: UserConfig, alignSide: AlignSide | undefined, index: number, total: number): { target: Vec2Like; current: Vec2Like } {
        const last = avatarPositions[id];
        const transform = { ...last ?? {
            targetPos: user.position,
            pos: user.position,
            rot: 0,
            scale: Vec2.ONE,
        } };
        if (alignSide && user.align) {
            const { align, side } = alignSide;
            transform.pos = this.calculateAlignPosition(alignSide, index, total);
            transform.targetPos = transform.pos;

            const horizontal = align.y === 0;

            const flipX = horizontal ? align.x > 0 : side === 'start';
            const flipY = horizontal ? true : align.y < 0;
            transform.scale = new Vec2(
                flipX ? -1 : 1,
                flipY ? -1 : 1,
            );
            transform.rot = horizontal ? TAU / 4 : 0;
            if (id !== get(dragState)?.id) {
                user.position = transform.pos;
                transform.targetPos = user.position;
            }
        } else {
            if (alignSide) {
                const dir = this.calculateAlignDir(alignSide);
                const newDistances = {
                    ...this.alignDistanceCache,
                    [id]: dir.dot(id === get(dragState)?.id ? get(dragPosition) ?? user.position : user.position),
                };
                const alignIndexes = Object.fromEntries(
                    Object.entries(newDistances)
                        .sort(comparator(([, offset]) => offset))
                        .map(([id], index) => [id, index]),
                );
                transform.targetPos = this.calculateAlignPosition(alignSide, alignIndexes[id], total);
            }
            transform.pos = user.position;
            transform.scale = Vec2.ONE;
            transform.rot = 0;
        }

        const t = 1 - Math.exp(-this.app.pipeline.time.delta / 64);
        const newTransform = {
            targetPos: transform.targetPos,
            pos: Vec2.from(last?.pos ?? transform.pos).lerp(transform.pos, t),
            rot: BetterMath.lerpAngle(last?.rot ?? 0, transform.rot, t),
            scale: Vec2.from(last?.scale ?? Vec2.ONE).lerp(transform.scale, t),
        };
        avatarPositions[id] = newTransform;
        this.app.pipeline.matrices.model.translate(newTransform.pos.x, newTransform.pos.y, 0);
        this.app.pipeline.matrices.model.scale(newTransform.scale.x, newTransform.scale.y, 1);
        this.app.pipeline.matrices.model.rotate(Axis.Z_POS.rotate(newTransform.rot));
        return {
            target: user.align ? newTransform.targetPos : newTransform.pos,
            current: newTransform.pos,
        };
    }

    public calculateAlignOffset(id: string, user: UserConfig): number {
        const dir = this.calculateAlignDir(this.app.config.align.alignSide!);
        const position = id === get(dragState)?.id ? get(dragPosition) ?? user.position : user.position;
        return dir.dot(position);
    }

    public calculateAlignments(entries: [string, VoiceStateItem][]): number {
        let alignTotal = 0;
        this.alignDistanceCache = {};
        const dragId = get(dragState)?.id;
        const draggingUser = dragId && this.app.config.users[dragId];
        const includeDragging = draggingUser && draggingUser.align;
        for (const [id, voiceState] of entries) {
            if (!voiceState) continue;
            const user = this.app.config.users[id];
            const isDraggingUser = dragId === id;
            if (!user.align && (!includeDragging || !isDraggingUser)) continue;

            alignTotal++;
            this.alignDistanceCache[id] = this.app.config.align.alignSide
                ? this.calculateAlignOffset(id, user)
                : 0;
        }
        return alignTotal;
    }

    public getAlignIndexes(): Record<string, number> {
        return Object.fromEntries(
            Object.entries(this.alignDistanceCache)
                .sort(comparator(([, offset]) => offset))
                .map(([id], index) => [id, index]),
        );
    }
    // --- Alignment UI Rendering (Held Tips) ---

    async drawHeldTips() {
        const dragging = get(dragState);
        if (!dragging) return;

        alignSide.set(undefined);
        const dragTime = performance.now() - dragging.time;
        const dragT = (1 - 1 / (dragTime + 1));

        const { matrices, context, draw } = this.app.pipeline;
        matrices.push();
        this.app.setupWorldMatrices();

        const worldToView = matrices.getWorldToView();
        const viewToWorld = matrices.getViewToWorld();
        matrices.view.identity(); // Draw in screen space

        const { width, height } = context.gl.canvas;
        const marginBounds = new AABB2(Vec2.ZERO, new Vec2(width, height)).shrink({ x: 40, y: 40 });
        const draggingPos = get(dragPosition);

        let closest: ClosestInfo | undefined = undefined;
        let anyHovered = false;

        // Process Align Indicators
        for (const align of ALIGNS) {
            const result = await this.renderAlignUI(align, dragT, marginBounds, worldToView, viewToWorld, draggingPos);
            if (result.hovered) {
                anyHovered = true;
                this.hoveredAlign = align.icon;
                if (result.closest && (!closest || result.closest.dist < closest.dist)) {
                    closest = result.closest;
                }
            } else if (this.hoveredAlign === align.icon) {
                // Reset if no longer hovered but ID matches (handled by generic assignment below)
            }
        }

        if (!anyHovered) {
            this.hoveredAlign = undefined;
        }

        // Draw "Clear Alignment" Button
        this.drawClearAlignmentButton(worldToView, viewToWorld, draggingPos);

        // Draw Tooltip & Selection
        if (closest) {
            const c = closest as ClosestInfo; // TS limitation
            const pos = c.pos.sub(c.align.dir.scale(this.radius * 4));

            this.drawTooltip(pos, c);
            draw.circle(pos.x, pos.y, 0, this.radius, PALETTE_RGB.ACCENT);
            await this.drawAlignIcon(pos, c.icon, PALETTE_RGB.BACKGROUND_1);
            alignSide.set({ align: c.align.dir, side: c.side });
        }

        matrices.pop();
    }

    private async renderAlignUI(
        align: AlignType,
        dragT: number,
        marginBounds: AABB2,
        worldToView: Mat4,
        viewToWorld: Mat4,
        draggingPos: Vec2 | undefined,
    ): Promise<{ hovered: boolean; closest?: ClosestInfo }> {
        const { draw } = this.app.pipeline;

        // Calculate Position
        const dir01 = align.dir.add(Vec2.ONE).scale(0.5);
        const pointWorld = align.dir.scale(ALIGN_MARGIN * dragT).add(dir01.mul(this.app.dimensions));
        const point = marginBounds.closest(worldToView.transform2(pointWorld));

        const isHovered = this.hoveredAlign === align.icon;
        const scale = isHovered ? 2 : 0;
        const dirPerp = this.getAlignPerpendicularOffset(align.dir)
            .scale(this.radius)
            .scale(scale);

        const bounds = new AABB2(
            point.sub(this.radiusVec).sub(dirPerp),
            point.add(this.radiusVec).add(dirPerp),
        );

        const renderBounds = viewToWorld.transformAABB2(bounds);
        const isInBound = draggingPos && renderBounds.distance(draggingPos) < 1;

        // Draw Base UI
        draw.roundedRect(bounds.min, bounds.max, this.radius, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);
        draw.roundedRect(bounds.min, bounds.max, this.radius, PALETTE_RGB.ACCENT, OUTLINE_WIDTH);

        if (!isInBound) {
            await this.drawAlignIcon(point, align.icon);
            return { hovered: false };
        }

        // Handle Hover Interactions
        const sides = [
            { side: 'start' as Side, pos: point.sub(dirPerp), icon: align.iconStart },
            { side: 'middle' as Side, pos: point, icon: align.icon },
            { side: 'end' as Side, pos: point.add(dirPerp), icon: align.iconEnd },
        ];

        draw.fontSize = 16;
        draw.fontFamily = 'Noto Sans JP';

        let bestMatch: ClosestInfo | undefined = undefined;

        for (const { side, pos, icon } of sides) {
            await this.drawAlignIcon(pos, icon);

            if (draggingPos) {
                const posWorld = viewToWorld.transform2(pos);
                const dist = draggingPos.distance(posWorld);
                if (!bestMatch || dist < bestMatch.dist) {
                    bestMatch = { align, side, icon, dist, pos };
                }
            }
        }

        return { hovered: true, closest: bestMatch };
    }

    private async drawClearAlignmentButton(worldToView: Mat4, viewToWorld: Mat4, draggingPos: Vec2 | undefined) {
        if (!this.app.config.align.alignSide || this.alignedCount() <= 2) {
            alignClear.set(false);
            return;
        }

        const { draw } = this.app.pipeline;
        const center = worldToView.transform2(this.app.dimensions.scale(0.5));
        const text = '整列を解除';
        const bounds = draw.measureTextActual(text).centered(Vec2.ONE.scale(0.5)).offset(center).expand({ x: 150, y: 50 });
        const boundsOutline = bounds.expand(Vec2.ONE.scale(2));
        const worldBounds = viewToWorld.transformAABB2(boundsOutline);

        const hovered = draggingPos ? worldBounds.contains(draggingPos) : false;
        alignClear.set(hovered);

        const textColor = hovered ? PALETTE_RGB.BACKGROUND_1 : PALETTE_RGB.ACCENT;
        const outlineWidth = hovered ? 0 : 2;

        if (hovered) {
            draw.roundedRect(boundsOutline.min, boundsOutline.max, this.radius + 2, PALETTE_RGB.ACCENT);
        } else {
            draw.roundedRect(boundsOutline.min, boundsOutline.max, this.radius + 2, PALETTE_RGB.ACCENT, outlineWidth);
        }
        await draw.textAlign(center, text, Vec2.ONE.scale(0.5), textColor);
    }

    private async drawAlignIcon(point: Vec2, icon: string, color = PALETTE_RGB.ACCENT) {
        const { draw } = this.app.pipeline;
        draw.fontFamily = 'tabler-icons';
        draw.fontSize = 16;
        draw.fontWeight = 'normal';
        await draw.textAlign(point, icon, Vec2.ONE.scale(0.4), color);
    }

    private drawTooltip(pos: Vec2, closest: ClosestInfo) {
        const { draw } = this.app.pipeline;
        const sideText = { start: '初め', middle: '真ん中', end: '最後' }[closest.side];
        const text = `${closest.align.name}に整列${sideText}`;
        const anchor = pos.add({ x: 0, y: this.radius * 2 + TOOLTIP_ARROW_SCALE + OUTLINE_WIDTH });

        const bounds = draw.measureTextActual(text)
            .setAt({ x: 0.5, y: 1 }, Vec2.ZERO)
            .offset(anchor)
            .expand({ x: 14, y: 8 });

        const center = bounds.center();
        draw.rectangle(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, PALETTE_RGB.TOOLTIP_BACKGROUND);

        draw.triangle(
            { x: center.x - TOOLTIP_ARROW_SCALE, y: bounds.min.y },
            { x: center.x, y: bounds.min.y - TOOLTIP_ARROW_SCALE },
            { x: center.x + TOOLTIP_ARROW_SCALE, y: bounds.min.y },
            PALETTE_RGB.TOOLTIP_BACKGROUND,
        );

        draw.fontFamily = 'Noto Sans JP';
        draw.fontSize = 16;
        draw.fontWeight = '600';
        draw.textAlign(anchor, text, { x: 0.5, y: 1 }, PALETTE_RGB.TOOLTIP_TEXT);
    }

    alignedCount(): number {
        return Object.entries(this.app.voiceState.states).filter(([userId]) => {
            const user = this.app.config.users[userId];
            return user?.align;
        }).length;
    }
}
