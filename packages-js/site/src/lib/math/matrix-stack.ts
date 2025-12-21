import { Mat4, type Mat4Like } from './mat4.js';
import { Quaternion } from './quaternion.js';

type Pose = {
    pose: Mat4;
};

export class MatrixStack {
    constructor(
        private readonly stack: Pose[] = [{ pose: Mat4.IDENTITY }],
    ) { }

    public push(): void {
        this.stack.push({ pose: this.stack[this.stack.length - 1].pose });
    }

    public pop(): void {
        this.stack.pop();
        if (this.stack.length === 0) {
            this.stack.push({ pose: Mat4.IDENTITY });
            console.warn('MatrixStack underflow');
        }
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
        return this.stack[this.stack.length - 1].pose;
    }

    public identity(): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = Mat4.IDENTITY;
    }

    public orthographic(left: number, top: number, right: number, bottom: number, near: number, far: number): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = Mat4.orthographic(left, right, bottom, top, near, far);
    }

    public perspective(fov: number, aspect: number, near: number, far: number): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = Mat4.perspective(fov, aspect, near, far);
    }

    public translate(x: number, y: number, z: number): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = pose.pose.translate(x, y, z);
    }

    public rotate(quaternion: Quaternion): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = pose.pose.rotate(quaternion);
    }

    public multiply(mat: Mat4Like): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = pose.pose.multiply(mat);
    }

    public scale(x: number, y: number, z: number): void {
        const pose = this.stack[this.stack.length - 1];
        pose.pose = pose.pose.scale(x, y, z);
    }
}
