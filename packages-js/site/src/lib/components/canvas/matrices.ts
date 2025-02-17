import type { Mat4 } from '$lib/math/mat4.js';
import { MatrixStack } from '$lib/math/matrix-stack.js';
import type { Vec2 } from '$lib/math/vec2.js';

export class Matrices {
    public readonly projection: MatrixStack = new MatrixStack();
    public readonly model: MatrixStack = new MatrixStack();
    public readonly view: MatrixStack = new MatrixStack();

    public get(): Mat4 {
        return this.projection.get().multiply(this.view.get().multiply(this.model.get()));
    }

    public projectPoint(vec: Vec2): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        return projection.xform2(view.xform2(model.xform2(vec)));
    }

    public unprojectPoint(vec: Vec2): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        const invProjection = projection.inverse();
        const invModel = model.inverse();
        const invView = view.inverse();
        return invModel.xform2(invView.xform2(invProjection.xform2(vec)));
    }
}
