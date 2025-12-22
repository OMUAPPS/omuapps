import type { Draw } from '$lib/components/canvas/draw';
import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { Matrices } from '$lib/components/canvas/matrices';
import type { EventKeyDown, EventMouseMove, EventMouseWheel, InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { Mat4 } from '$lib/math/mat4';
import { clamp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../consts';
import type { AppRenderer } from './app-renderer';
import type { AttachedObject, ContactCandidate } from './avatar';
import type { GameObject } from './object';

interface RenderedObject {
    worldBounds: AABB2;
}

interface AttachedObjectRenders {
    objects: Map<string, RenderedObject>;
}

type HoveredObject = {
    type: 'detached';
    objectId: string;
} | {
    type: 'attached';
    userId: string;
    objectId: string;
};

export class ObjectManager {
    private renderedObjects: Map<string, AttachedObjectRenders> = new Map();
    hoveredObject: HoveredObject | undefined;
    heldObject: string | undefined;
    objectAttachCandidate: {
        id: string;
        candidate: ContactCandidate;
        matrix: Mat4;
        offset: Vec2;
    } | undefined;

    constructor(
        private readonly app: AppRenderer,
    ) {}

    public handleInput(event: InputEvent) {
        switch (event.kind) {
            case 'mouse-down': this.onMouseDown(); break;
            case 'mouse-up': this.onMouseUp(); break;
            case 'mouse-move': this.onMouseMove(event); break;
            case 'mouse-wheel': this.onMouseWheel(event); break;
            case 'key-down': this.onKeyDown(event); break;
        }
    }

    private onMouseDown() {
        console.log('mouse down');
        if (this.hoveredObject) {
            if (this.hoveredObject.type === 'detached') {
                this.heldObject = this.hoveredObject.objectId;
            } else if (this.hoveredObject.type === 'attached') {
                const { objectId, userId } = this.hoveredObject;
                const object = this.app.world.attahed[userId]?.find(({ object }) => object.id === objectId);
                if (!object) return;
                this.app.world.attahed[userId] = this.app.world.attahed[userId].filter(({ object }) => object.id !== objectId);
                this.app.world.objects[object.object.id] = object.object;
                this.heldObject = objectId;
            }
        }
    }

    private onMouseUp() {
        const object = this.heldObject && this.app.world.objects[this.heldObject];
        if (this.objectAttachCandidate && object) {
            const attached = this.objectAttachCandidate.candidate.attach(object, this.objectAttachCandidate.matrix, this.objectAttachCandidate.offset);
            const objects = this.app.world.attahed[this.objectAttachCandidate.id] ??= [];
            objects.push(attached);
            delete this.app.world.objects[attached.object.id];
        }
        this.heldObject = undefined;
    }

    private onMouseMove(event: EventMouseMove) {
        const object = this.heldObject && this.app.world.objects[this.heldObject];
        if (object) {
            const start = new Vec2(50, 150);
            const end = new Vec2(50, 150);
            const { matrices } = this.app.pipeline;
            const screen = new Vec2(matrices.width, matrices.height);
            const inner = screen.sub(start).sub(end);
            const scaleVector = inner.div(this.app.dimensions);
            const scaleFactor = Math.min(scaleVector.x, scaleVector.y);
            const delta = event.mouse.delta.scale(1 / scaleFactor);
            object.position = delta.add(object.position);
        }
    }

    private onMouseWheel(event: EventMouseWheel) {
        if (!this.hoveredObject) return;
        if (this.hoveredObject.type === 'detached') {
            const object = this.app.world.objects[this.hoveredObject.objectId];
            if (object) {
                object.scale = clamp(Math.exp(Math.log(object.scale) - event.delta / 500), 0.1, 10);
            }
        } else if (this.hoveredObject.type === 'attached') {
            const { objectId, userId } = this.hoveredObject;
            const attached = this.app.world.attahed[userId].find(({ object }) => object.id === objectId);
            if (attached) {
                attached.object.scale = clamp(Math.exp(Math.log(attached.object.scale) - event.delta / 500), 0.1, 10);
            }
        }
    }

    private onKeyDown(event: EventKeyDown) {
        if (!this.hoveredObject) return;
        if (event.key !== 'Backspace') return;
        if (this.hoveredObject.type === 'detached' && this.app.world.objects[this.hoveredObject.objectId]) {
            delete this.app.world.objects[this.hoveredObject.objectId];
        } else if (this.hoveredObject.type === 'attached') {
            const { objectId, userId } = this.hoveredObject;
            this.app.world.attahed[userId] = this.app.world.attahed[userId].filter(({ object }) => {
                return object.id !== objectId;
            });
        }
    }

    async drawObjects() {
        const { input, matrices, draw } = this.app.pipeline;

        this.objectAttachCandidate = undefined;
        let newHoveredObject: HoveredObject | undefined = undefined;

        const mouseWorld = matrices.getViewToWorld().transform2(input.mouse.pos);

        for (const [id, object] of Object.entries(this.app.world.objects)) {
            const hoveredId = this.processObject(id, object, mouseWorld);

            if (hoveredId) {
                newHoveredObject = { type: 'detached', objectId: hoveredId };
            }
        }

        // Check rendered objects

        for (const [userId, rendered] of this.renderedObjects.entries()) {
            for (const [objectId, renderedObject] of rendered.objects.entries()) {
                const isHit = renderedObject.worldBounds.contains(mouseWorld);
                if (isHit) {
                    newHoveredObject = {
                        type: 'attached',
                        userId,
                        objectId,
                    };
                    draw.roundedRect(
                        renderedObject.worldBounds.min,
                        renderedObject.worldBounds.max,
                        10,
                        PALETTE_RGB.ACCENT,
                        4,
                    );
                }
            }
        }

        this.renderedObjects.clear();
        this.hoveredObject = newHoveredObject;
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
        const isHeld = this.heldObject === id;
        const isHoveredOrHeld = this.hoveredObject?.type === 'detached' && this.hoveredObject.objectId === id || isHeld;

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

                this.objectAttachCandidate = {
                    id: avatarId,
                    candidate,
                    matrix: worldToModel,
                    offset: mouseModel,
                };
            }
        }
    }

    public getRenderObject(userId: string, attached: AttachedObject) {
        const { matrices, draw } = this.app.pipeline;
        return {
            render: () => {
                const source = this.app.sourceManager.getSourceTexture(attached.object.source);
                if (source.type === 'failed') {
                    delete this.app.world.objects[userId];
                }
                if (source.type !== 'loaded') return;
                const { texture } = source;
                matrices.model.push();
                const matrix = Mat4.from(attached.matrix);
                const inverse = matrix.basis.inverse();
                matrices.model.translate(attached.origin.x, attached.origin.y, 0);
                matrices.model.scale(attached.object.scale, attached.object.scale, 1);
                matrices.model.multiply3(inverse);
                matrices.model.translate(-attached.offset.x, -attached.offset.y, 0);
                matrices.model.translate(-texture.width / 2, -texture.height / 2, 0);
                const bounds = new AABB2(
                    Vec2.ZERO,
                    Vec2.from({ x: texture.width, y: texture.height }),
                );
                draw.texture(
                    0, 0,
                    texture.width, texture.height,
                    texture,
                );
                const worldBounds = matrices.getModelToWorld().transformAABB2(bounds);
                matrices.model.pop();
                const renderedObjects = this.renderedObjects.get(userId) ?? { objects: new Map() };
                renderedObjects.objects.set(attached.object.id, { worldBounds });
                this.renderedObjects.set(userId, renderedObjects);
            },
            attached,
        };
    }
}
