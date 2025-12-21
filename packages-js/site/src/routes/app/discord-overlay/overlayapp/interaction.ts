// interaction.ts
import type { EventKeyDown, EventMouseMove, EventMouseWheel, Input } from '$lib/components/canvas/pipeline.js';
import { clamp } from '$lib/math/math.js';
import { Vec2 } from '$lib/math/vec2.js';
import type { AppRenderer } from './app-renderer.js';
import type { ContactCandidate } from './avatar.js';

export class InteractionManager {
    hoveredObject: string | undefined;
    heldObject: string | undefined;
    objectAttachCandidate: {
        id: string;
        candidate: ContactCandidate;
        offset: Vec2;
    } | undefined;

    constructor(
        private app: AppRenderer,
    ) {}

    handleInput(input: Input) {
        for (const event of input) {
            switch (event.kind) {
                case 'mouse-down': this.onMouseDown(); break;
                case 'mouse-up': this.onMouseUp(); break;
                case 'mouse-move': this.onMouseMove(event); break;
                case 'mouse-wheel': this.onMouseWheel(event); break;
                case 'key-down': this.onKeyDown(event); break;
            }
        }
    }

    private onMouseDown() {
        console.log('mouse down');
        if (this.hoveredObject) {
            this.heldObject = this.hoveredObject;
        }
    }

    private onMouseUp() {
        const object = this.heldObject && this.app.world.objects[this.heldObject];
        if (this.objectAttachCandidate && object) {
            const attached = this.objectAttachCandidate.candidate.attach(object, this.objectAttachCandidate.offset);
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
        const object = this.hoveredObject && this.app.world.objects[this.hoveredObject];
        if (object) {
            object.scale = clamp(Math.exp(Math.log(object.scale) - event.delta / 500), 0.1, 10);
        }
    }

    private onKeyDown(event: EventKeyDown) {
        if (event.key === 'Backspace' && this.hoveredObject && this.app.world.objects[this.hoveredObject]) {
            delete this.app.world.objects[this.hoveredObject];
        }
    }
}
