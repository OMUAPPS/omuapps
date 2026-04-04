import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Timer } from '$lib/timer';
import { PALETTE_RGB } from '../colors';
import type { Game } from './game';

export const CLIENT_RESOLUTION = new Vec2(1920, 1080).scale(1.5);
export const CLIENT_WORLD_BOUNDS = new AABB2(CLIENT_RESOLUTION.scale(-0.5), CLIENT_RESOLUTION.scale(0.5));
export const ASSET_RESOLUTION = new Vec2(1080, 1920).scale(1.5);
export const ASSET_WORLD_BOUNDS = new AABB2(ASSET_RESOLUTION.scale(-0.5), ASSET_RESOLUTION.scale(0.5));
const TRANSITION_DURATION = 500;

export class GameRenderer {
    public bounds: AABB2 = AABB2.ZEROONE;
    public resolution: Vec2 = Vec2.ZERO;
    public worldBounds: AABB2 = AABB2.ZEROONE;
    public fitBounds: AABB2 = AABB2.ZEROONE;
    public containBounds: AABB2 = AABB2.ZEROONE;
    public scale = 1;

    constructor(
        private readonly game: Game,
    ) {}

    public async prepare() {
        this.prepareGL();
        this.setupMatrices();
    }

    private setupMatrices() {
        const { matrices } = this.game.pipeline;
        if (this.game.side === 'client') {
            this.resolution = CLIENT_RESOLUTION;
            this.worldBounds = CLIENT_WORLD_BOUNDS;
        } else {
            this.resolution = ASSET_RESOLUTION;
            this.worldBounds = ASSET_WORLD_BOUNDS;
        }
        matrices.identity();
        const renderResolution = new Vec2(matrices.width, matrices.height);
        matrices.projection.orthographic(0, 0, renderResolution.x, renderResolution.y, -1, 1);
        this.scale = Math.min(renderResolution.x / this.resolution.x);
        const center = renderResolution.scale(0.5);
        matrices.view.translate(-center.x, -center.y, 0);
        matrices.view.scale(this.scale, this.scale, 1);
        matrices.view.translate(center.x / this.scale * 2, center.y / this.scale * 2, 0);
        this.bounds = matrices.getViewToWorld().transformAABB2(new AABB2(Vec2.ZERO, renderResolution));
        this.fitBounds = this.bounds.fit(this.resolution);
        this.containBounds = this.bounds.contain(this.resolution);
    }

    private prepareGL() {
        const { context, matrices } = this.game.pipeline;
        const { gl } = context;
        gl.colorMask(true, true, true, true);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        context.stateManager.setViewport({ x: matrices.width, y: matrices.height });
    }

    public async renderTransition() {
        const { draw } = this.game.pipeline;
        const transition = this.game.states.transition.value;
        const scene = this.game.states.scene;
        const { current } = transition;
        if (!current) return;
        const isBackground = this.game.side === 'background';
        const timeOffset = isBackground ? 500 / 3 : 0;
        const elapsed = Timer.now() - current.start - timeOffset;
        const time = elapsed / TRANSITION_DURATION * 3;
        const t = time % 1;
        const stage = Math.floor(time);
        if (this.game.side === 'client') {
            if (stage >= 1 && scene.value.type !== current.to.type) {
                scene.registry.set(current.to);
            }
            if (stage > 3) {
                transition.current = null;
            }
        }
        if (stage > 2) {
            return;
        }
        const { min } = this.bounds;
        const size = this.bounds.size;
        const a = stage === 0
            ? lerp(1, 0, t)
            : stage === 1
                ? 0
                : lerp(0, -1, t);
        const offset = size.y * Math.pow(a, 3);
        draw.rectangle(min.x, min.y + offset, min.x + size.x, min.y + offset + size.y, isBackground ? PALETTE_RGB.ACCENT : PALETTE_RGB.BACKGROUND);
    }
}
