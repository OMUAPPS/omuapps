import type { Game } from './game';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RenderEvent {
}

export class GameRenderer {
    constructor(
        private readonly game: Game,
    ) {}

    public async clear() {
        this.prepareGL();
        this.setupMatrices();
    }

    private setupMatrices() {
        const { matrices } = this.game.pipeline;
        matrices.identity();
        matrices.projection.orthographic(0, 0, matrices.width, matrices.height, -1, 1);
    }

    private prepareGL() {
        const { context, matrices } = this.game.pipeline;
        const { gl } = context;
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, matrices.width, matrices.height);
    }
}
