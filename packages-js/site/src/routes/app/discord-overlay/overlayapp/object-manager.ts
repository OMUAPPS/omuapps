import type { Draw } from '$lib/components/canvas/draw';
import type { Matrices } from '$lib/components/canvas/matrices';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../consts';
import type { AppRenderer } from './app-renderer';

export class ObjectManager {
    constructor(
        private readonly app: AppRenderer,
    ) {}

    async drawObjects() {
        const { input, draw, matrices } = this.app.pipeline;
        this.app.interaction.objectAttachCandidate = undefined;

        let newHoveredObject: string | undefined = undefined;

        for (const [id, object] of Object.entries(this.app.world.objects)) {
            const source = this.app.sourceManager.getSourceTexture(object.source);

            if (source.type === 'failed') {
                delete this.app.world.objects[id];
                continue;
            }
            if (source.type !== 'loaded') continue;

            const { texture } = source;
            const size = new Vec2(texture.width, texture.height);
            const halfSize = size.scale(0.5);

            matrices.model.push();
            matrices.model.translate(object.position.x, object.position.y, 0);
            matrices.model.scale(object.scale, object.scale, 1);

            draw.texture(
                -halfSize.x, -halfSize.y,
                halfSize.x, halfSize.y,
                texture,
            );

            // Interaction Check (Mouse vs Object)
            const mouseWorld = matrices.getViewToWorld().transform2(input.mouse.pos);
            const mouseModel = matrices.getWorldToModel().transform2(mouseWorld);
            const boundsLocal = new AABB2(halfSize.scale(-1), halfSize);
            const boundsWorld = matrices.getModelToWorld().transformAABB2(boundsLocal);

            if (boundsWorld.contains(mouseWorld)) {
                newHoveredObject = id;
            }

            matrices.model.pop();

            this.drawObjectHighlights(id, boundsWorld, mouseWorld, mouseModel, draw, matrices);
        }

        this.app.interaction.hoveredObject = newHoveredObject;
    }

    private drawObjectHighlights(
        id: string,
        boundsWorld: AABB2,
        mouseWorld: Vec2,
        mouseModel: Vec2,
        draw: Draw,
        matrices: Matrices,
    ) {
        const expandedBounds = boundsWorld.expand(Vec2.ONE.scale(10));
        const isHoveredOrHeld = this.app.interaction.hoveredObject === id || this.app.interaction.heldObject === id;

        if (isHoveredOrHeld) {
            draw.roundedRect(expandedBounds.min, expandedBounds.max, 10, PALETTE_RGB.ACCENT, 4);
        }

        // Attach Candidate Logic (Only if held)
        if (this.app.interaction.heldObject === id) {
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
        for (const [id, { bounds, worldToModel, context }] of this.app.avatarRenderer.renderedAvatars.entries()) {
            if (!bounds.intersects(boundsWorld)) continue;

            const offsetWorld = mouseWorld.sub(worldToModel.offset.cast2());
            const modelPos = worldToModel.asMat2().inverse().transform(offsetWorld);
            const candidate = context.getContactCandidate(modelPos);

            if (candidate) {
                matrices.model.push();
                matrices.model.multiply(worldToModel);
                candidate.render(matrices);

                this.app.interaction.objectAttachCandidate = {
                    id,
                    candidate,
                    offset: mouseModel,
                };

                matrices.model.pop();

                const expanded = boundsWorld.expand(Vec2.ONE.scale(10));
                draw.roundedRect(expanded.min, expanded.max, 10, PALETTE_RGB.ACCENT, 4);
            }
        }
    }
}
