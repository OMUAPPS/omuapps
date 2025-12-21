import type { Draw } from '$lib/components/canvas/draw';
import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { Matrices } from '$lib/components/canvas/matrices';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../consts';
import type { AppRenderer } from './app-renderer';
import type { GameObject } from './object';

export class ObjectManager {
    constructor(
        private readonly app: AppRenderer,
    ) {}

    async drawObjects() {
        const { input, matrices } = this.app.pipeline;

        this.app.interaction.objectAttachCandidate = undefined;
        let newHoveredObject: string | undefined = undefined;

        const mouseWorld = matrices.getViewToWorld().transform2(input.mouse.pos);

        for (const [id, object] of Object.entries(this.app.world.objects)) {
            const hoveredId = this.processObject(id, object, mouseWorld);

            if (hoveredId) {
                newHoveredObject = hoveredId;
            }
        }

        this.app.interaction.hoveredObject = newHoveredObject;
    }

    private processObject(id: string, object: GameObject, mouseWorld: Vec2): string | undefined {
        const source = this.app.sourceManager.getSourceTexture(object.source);

        if (source.type === 'failed') {
            delete this.app.world.objects[id];
            return undefined;
        }
        if (source.type !== 'loaded') return undefined;

        const { draw, matrices } = this.app.pipeline;
        const { texture } = source;
        const size = new Vec2(texture.width, texture.height);
        const halfSize = size.scale(0.5);

        matrices.model.push();
        matrices.model.translate(object.position.x, object.position.y, 0);
        matrices.model.scale(object.scale, object.scale, 1);

        this.renderTexture(draw, texture, halfSize);

        const boundsLocal = new AABB2(halfSize.scale(-1), halfSize);
        const boundsWorld = matrices.getModelToWorld().transformAABB2(boundsLocal);
        const isHit = boundsWorld.contains(mouseWorld);

        const mouseModel = matrices.getWorldToModel().transform2(mouseWorld);

        matrices.model.pop();

        this.renderHighlightsAndAttachments(id, boundsWorld, mouseWorld, mouseModel, draw, matrices);

        return isHit ? id : undefined;
    }

    private renderTexture(draw: Draw, texture: GlTexture, halfSize: Vec2) {
        draw.texture(
            -halfSize.x, -halfSize.y,
            halfSize.x, halfSize.y,
            texture,
        );
    }

    private renderHighlightsAndAttachments(
        id: string,
        boundsWorld: AABB2,
        mouseWorld: Vec2,
        mouseModel: Vec2,
        draw: Draw,
        matrices: Matrices,
    ) {
        const { hoveredObject, heldObject } = this.app.interaction;
        const isHeld = heldObject === id;
        const isHoveredOrHeld = hoveredObject === id || isHeld;

        if (isHoveredOrHeld) {
            const expandedBounds = boundsWorld.expand(Vec2.ONE.scale(10));
            draw.roundedRect(expandedBounds.min, expandedBounds.max, 10, PALETTE_RGB.ACCENT, 4);
        }

        if (isHeld) {
            this.checkAndDrawAttachCandidates(boundsWorld, mouseWorld, mouseModel, draw, matrices);
        }
    }

    private checkAndDrawAttachCandidates(
        boundsWorld: AABB2,
        mouseWorld: Vec2,
        mouseModel: Vec2,
        draw: Draw,
        matrices: Matrices,
    ) {
        for (const [avatarId, { bounds, worldToModel, context }] of this.app.avatarRenderer.renderedAvatars.entries()) {
            if (!bounds.intersects(boundsWorld)) continue;

            const offsetWorld = mouseWorld.sub(worldToModel.offset.cast2());
            const modelPos = worldToModel.asMat2().inverse().transform(offsetWorld);
            const candidate = context.getContactCandidate(modelPos);

            if (candidate) {
                matrices.model.push();
                matrices.model.multiply(worldToModel);
                candidate.renderHighlight(matrices);
                matrices.model.pop();

                const expanded = boundsWorld.expand(Vec2.ONE.scale(10));
                draw.roundedRect(expanded.min, expanded.max, 10, PALETTE_RGB.ACCENT, 4);

                this.app.interaction.objectAttachCandidate = {
                    id: avatarId,
                    candidate,
                    matrix: worldToModel,
                    offset: mouseModel,
                };
            }
        }
    }
}
