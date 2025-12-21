import type { Mat4 } from '$lib/math/mat4.js';
import { MatrixStack } from '$lib/math/matrix-stack.js';
import type { Vec2, Vec2Like } from '$lib/math/vec2.js';

export class Matrices {
    public width: number = 0;
    public height: number = 0;
    public readonly projection: MatrixStack = new MatrixStack();
    public readonly model: MatrixStack = new MatrixStack();
    public readonly view: MatrixStack = new MatrixStack();

    constructor() {
        this.projection.push();
        this.model.push();
        this.view.push();
    }

    public push(): void {
        this.projection.push();
        this.model.push();
        this.view.push();
    }

    public pop(): void {
        this.projection.pop();
        this.model.pop();
        this.view.pop();
    }

    public identity() {
        this.projection.identity();
        this.model.identity();
        this.view.identity();
    }

    public scope(callback: () => void): void {
        this.push();
        callback();
        this.pop();
    }

    public async scopeAsync(callback: () => Promise<void>): Promise<void> {
        this.push();
        await callback();
        this.pop();
    }

    public get(): Mat4 {
        return this.projection.get().multiply(this.view.get().multiply(this.model.get()));
    }

    public projectPoint(vec: Vec2Like): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        return projection.transform2(view.transform2(model.transform2(vec)));
    }

    public unprojectPoint(vec: Vec2Like): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        const invProjection = projection.inverse();
        const invModel = model.inverse();
        const invView = view.inverse();
        return invModel.transform2(invView.transform2(invProjection.transform2(vec)));
    }

    public projectBasis(point: Vec2Like): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        return projection.basisTransform2(view.basisTransform2(model.basisTransform2(point)));
    }

    public unprojectBasis(point: Vec2Like): Vec2 {
        const projection = this.projection.get();
        const model = this.model.get();
        const view = this.view.get();
        const invProjection = projection.inverse();
        const invModel = model.inverse();
        const invView = view.inverse();
        return invModel.basisTransform2(invView.basisTransform2(invProjection.basisTransform2(point)));
    }

    public getModelToWorld(): Mat4 {
        return this.model.get();
    }

    public getWorldToModel(): Mat4 {
        return this.model.get().inverse();
    }

    public getWorldToView(): Mat4 {
        return this.view.get();
    }

    public getViewToWorld(): Mat4 {
        return this.view.get().inverse();
    }

    public getModelToView(): Mat4 {
        return this.view.get().multiply(this.model.get());
    }

    public getViewToModel(): Mat4 {
        return this.model.get().inverse().multiply(this.view.get().inverse());
    }
}
