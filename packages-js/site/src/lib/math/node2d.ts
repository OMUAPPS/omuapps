import { Transform2D } from './transform2d.js';
import { Vec2 } from './vec2.js';

export class Node2D {
    constructor(
        public position: Vec2,
        public rotation: number,
        public scale: Vec2,
        public parent: Node2D | null = null,
    ) { }

    get transform(): Transform2D {
        return new Transform2D([
            new Vec2(Math.cos(this.rotation), Math.sin(this.rotation)).scale(this.scale.x),
            new Vec2(-Math.sin(this.rotation), Math.cos(this.rotation)).scale(this.scale.y),
            this.position
        ]);
    }

    get globalTransform(): Transform2D {
        if (!this.parent) {
            return this.transform;
        }
        return this.parent.globalTransform.multiply(this.transform);
    }

    get globalPosition(): Vec2 {
        return this.globalTransform.origin;
    }

    set globalPosition(position: Vec2) {
        if (!this.parent) {
            this.position = position;
            return;
        }
        const inv = this.parent.globalTransform.affineInverse();
        this.position = inv.xform(position);
    }
}
