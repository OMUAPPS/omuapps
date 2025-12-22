import type { Draw } from '$lib/components/canvas/draw';
import { get } from 'svelte/store';
import { PALETTE_RGB } from '../consts';
import { scaleFactor, selectedAvatar } from '../states';
import type { AppRenderer } from './app-renderer';
import { LayoutEngine } from './layout-engine';

export class ScreenRenderer {
    constructor(
        private readonly app: AppRenderer,
    ) {}

    async drawScreen() {
        const selectedAvatarId = get(selectedAvatar);
        if (!selectedAvatarId) return;

        const avatarConfig = this.app.config.avatars[selectedAvatarId];
        if (!avatarConfig) return;

        const avatarStatus = this.app.avatarManager.loadAvatarModelById(selectedAvatarId);
        if (avatarStatus.type !== 'loaded') return;

        const { matrices, context, draw } = this.app.pipeline;
        const { width, height } = context.gl.canvas;

        matrices.view.push();
        matrices.view.identity();

        // Background
        draw.rectangle(0, 0, width, height, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);

        // Setup Avatar View
        matrices.view.translate(width / 2, height / 2 + 60, 0);
        const scale = 1 / Math.min(this.app.dimensions.x / width, this.app.dimensions.y / height);
        scaleFactor.set(1 / scale / avatarConfig.scale);
        matrices.view.scale(scale, scale, 1);

        // Draw Avatar
        matrices.model.push();
        this.app.avatarRenderer.applyAvatarTransform(avatarConfig);
        const avatarContext = avatarStatus.data.avatar.create();

        avatarContext.render({
            id: selectedAvatarId,
            talking: false, mute: false, deaf: false,
            self_mute: false, self_deaf: false, suppress: false,
            config: { pngtuber: { layer: 0 } },
        }, { effects: [], objects: [] });

        matrices.model.pop();

        // Draw Frame Decoration
        this.drawAvatarPreviewFrame(draw);

        matrices.view.pop();
    }

    private drawAvatarPreviewFrame(draw: Draw) {
        const decorations = [
            { line: 3, color: PALETTE_RGB.BACKGROUND_2_TRANSPARENT },
            { line: 2, color: PALETTE_RGB.ACCENT },
        ];

        for (const { line, color } of decorations) {
            draw.circle(0, 0, LayoutEngine.AVATAR_FACE_RADIUS - line * 2, LayoutEngine.AVATAR_FACE_RADIUS + line * 2, color);
            draw.rectangle(-LayoutEngine.AVATAR_FACE_RADIUS - 150, -line, -LayoutEngine.AVATAR_FACE_RADIUS - 50, line, PALETTE_RGB.ACCENT);

            const triangleSize = 20;
            draw.triangle(
                { x: -LayoutEngine.AVATAR_FACE_RADIUS - 150, y: -triangleSize - line },
                { x: -LayoutEngine.AVATAR_FACE_RADIUS - 150 - triangleSize, y: 0 },
                { x: -LayoutEngine.AVATAR_FACE_RADIUS - 150, y: triangleSize + line },
                color,
            );
        }
    }
}
