import type { AppRenderer } from './app-renderer';

export class ScreenshotSystem {
    constructor(
        private readonly app: AppRenderer,
    ) {}

    async takeScreenshot() {
        const { context, matrices } = this.app.pipeline;
        const { gl } = context;
        const { width: oldWidth, height: oldHeight } = gl.canvas;

        // Force 1080p for screenshot
        gl.canvas.width = this.app.dimensions.x;
        gl.canvas.height = this.app.dimensions.y;

        try {
            this.app.prepareGL();
            gl.viewport(0, 0, this.app.dimensions.x, this.app.dimensions.y);

            matrices.identity();
            matrices.projection.orthographic(0, 0, this.app.dimensions.x, this.app.dimensions.y, -1, 1);

            await this.app.avatarRenderer.drawAvatars();
            await this.app.layoutEngine.drawHeldTips();

            (gl.canvas as HTMLCanvasElement).toBlob((blob) => {
                if (!blob) return;
                const link = document.createElement('a');
                link.download = new Date().toLocaleString() + '.png';
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 'image/png');
        } finally {
            gl.canvas.width = oldWidth;
            gl.canvas.height = oldHeight;
        }
    }
}
