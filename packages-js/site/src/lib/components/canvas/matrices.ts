import { MatrixStack } from '$lib/math/matrix-stack.js';

export class Matrices {
    public readonly projection: MatrixStack = new MatrixStack();
    public readonly model: MatrixStack = new MatrixStack();
    public readonly view: MatrixStack = new MatrixStack();
}
