import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { Timer } from '$lib/timer';
import type { DragDropFile } from '@omujs/omu/api/dashboard';
import { PALETTE_RGB } from '../colors';
import { validateAsset, type Asset } from './asset';
import type { Game } from './game';
import type { ValidateResult } from './helper';
import { getTransform, validateTransform, type Transform } from './transform';

// ============================================================================
// Constants & Types
// ============================================================================

export const CLIENT_RESOLUTION = new Vec2(1920, 1080).scale(1.5);
export const CLIENT_WORLD_BOUNDS = new AABB2(CLIENT_RESOLUTION.scale(-0.5), CLIENT_RESOLUTION.scale(0.5));

export const ASSET_RESOLUTION = new Vec2(1080, 1920).scale(1.5);
export const ASSET_WORLD_BOUNDS = new AABB2(ASSET_RESOLUTION.scale(-0.5), ASSET_RESOLUTION.scale(0.5));

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];

export interface AssetTransform {
    asset: Asset;
    transform: Transform;
}

// ============================================================================
// Validators
// ============================================================================

export function validateAssetTransform(value: AssetTransform): ValidateResult<AssetTransform> {
    const assetResult = validateAsset(value.asset);
    if (assetResult.type === 'invalid') {
        return { type: 'invalid', message: `assetが無効: ${assetResult.message}` };
    }

    const transformResult = validateTransform(value.transform);
    if (transformResult.type === 'invalid') {
        return { type: 'invalid', message: `transformが無効: ${transformResult.message}` };
    }

    return { type: 'valid', value };
}

// ============================================================================
// Renderer
// ============================================================================

export class GameRenderer {
    // --- State Properties ---
    public bounds: AABB2 = AABB2.ZEROONE;
    public resolution: Vec2 = Vec2.ZERO;
    public worldBounds: AABB2 = AABB2.ZEROONE;
    public fitBounds: AABB2 = AABB2.ZEROONE;
    public containBounds: AABB2 = AABB2.ZEROONE;
    public scale = 1;

    // --- Internal Properties ---
    private mainFrameBuffer: GlFramebuffer;
    private mainTexture: GlTexture;

    constructor(private readonly game: Game) {
        const { context } = game.pipeline;
        this.mainFrameBuffer = context.createFramebuffer();
        this.mainTexture = context.createTexture();

        this.initBuffers();
    }

    // ------------------------------------------------------------------------
    // 1. Initialization & Preparation
    // ------------------------------------------------------------------------

    private initBuffers() {
        this.mainTexture.use(() => {
            this.mainTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            this.mainTexture.setImage(null, {
                width: 4, height: 4,
                internalFormat: 'rgba', format: 'rgba',
            });
        });

        this.mainFrameBuffer.use(() => {
            this.mainFrameBuffer.attachTexture(this.mainTexture);
        });
    }

    public async prepare() {
        this.prepareGL();
        this.setupMatrices();
    }

    private prepareGL() {
        const { context, matrices } = this.game.pipeline;
        const { gl } = context;

        gl.colorMask(true, true, true, true);
        this.clear();
        this.resetBlending();
        context.stateManager.setViewport({ x: matrices.width, y: matrices.height });
    }

    private setupMatrices() {
        const { matrices } = this.game.pipeline;

        // Set resolution based on game side
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

    // ------------------------------------------------------------------------
    // 2. Core Rendering
    // ------------------------------------------------------------------------

    public async render(callback: () => Promise<void>): Promise<void> {
        const { context, matrices, draw } = this.game.pipeline;
        const { gl } = context;

        this.mainTexture.use(() => {
            this.mainTexture.ensureSize(matrices.width, matrices.height);
        });

        // 1st Pass: Draw to main frame buffer
        await this.mainFrameBuffer.useAsync(async () => {
            this.mainFrameBuffer.clear(Vec4.ZERO);
            gl.colorMask(true, true, true, true);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            this.resetBlending();

            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

            await callback();
        });

        // 2nd Pass: Render texture to screen
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        draw.texture(...this.bounds.toArray({ flipY: true }), this.mainTexture);
    }

    // ------------------------------------------------------------------------
    // 3. GL Utilities
    // ------------------------------------------------------------------------

    public clear() {
        const { gl } = this.game.pipeline.context;
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
    }

    public resetBlending() {
        const { gl } = this.game.pipeline.context;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    public isInScreenSpace(bounds: AABB2): boolean {
        const { matrices } = this.game.pipeline;
        const screenBounds = matrices.get().transformAABB2(bounds);
        return AABB2.CLIPSPACE.intersects(screenBounds);
    }

    // ------------------------------------------------------------------------
    // 4. Specific Renderers (UI / Elements)
    // ------------------------------------------------------------------------

    public async drawAssetTransform(assetTransform: AssetTransform) {
        const { matrices, draw } = this.game.pipeline;
        const { asset, transform } = assetTransform;

        const result = await this.game.asset.getTexture(asset).promise;
        if (result.type !== 'ready') return;

        const { texture: tex } = result.data;
        const mat = getTransform(transform);

        matrices.model.scope(() => {
            matrices.model.multiply(mat.getMat4());
            draw.texture(-tex.width / 2, -tex.height / 2, tex.width / 2, tex.height / 2, tex);
        });
    }

    public async renderTransition() {
        const { states, side, pipeline: { draw } } = this.game;
        const transition = states.transition.value;
        const { current } = transition;

        if (!current || side === 'background') return;

        const TRANSITION_OFFSET_MS = 50;
        const TRANSITION_MULTIPLIER = 3;

        const elapsed = Timer.now() - current.start - TRANSITION_OFFSET_MS;
        if (elapsed < 0) return;

        const time = (elapsed / current.options.duration) * TRANSITION_MULTIPLIER;
        const t = time % 1;
        const stage = Math.floor(time);

        if (side === 'client') {
            if (stage >= 1 && states.scene.value.type !== current.to.type) {
                states.scene.registry.set(current.to);
            }
            if (stage > 3) {
                transition.current = null;
            }
        }

        if (stage > 2) return;

        const { min, size } = this.bounds;
        const a = stage === 0 ? lerp(1, 0, t) : (stage === 1 ? 0 : lerp(0, -1, t));
        const offset = size.y * Math.pow(a, 3);

        // Draw background
        draw.rectangle(min.x, min.y + offset, min.x + size.x, min.y + offset + size.y, PALETTE_RGB.BACKGROUND);

        // Draw Text
        draw.fontSize = 48;
        draw.fontFamily = 'Zen Maru Gothic';
        await draw.textAlign(
            Vec2.ZERO,
            current.options.title,
            Vec2.CENTER,
            PALETTE_RGB.ACCENT.with({ w: Math.sin((time / 3) * Math.PI) }),
        );
    }

    public async renderDragFile() {
        const { dragFile, pipeline: { draw } } = this.game;
        if (!dragFile) return;

        const { data, time } = dragFile;
        const elapsed = Timer.now() - time;
        const ANIMATION_SPEED = 50;
        const t = 1 - 1 / (elapsed / ANIMATION_SPEED + 1);
        const alpha = t * 0.9;

        // Draw overlay
        draw.rectangle(...this.bounds.toArray(), PALETTE_RGB.DRAGFILE_BG.with({ w: alpha }));
        draw.rectangleStroke(...this.bounds.shrink({ x: t * 100, y: t * 100 }).toArray(), PALETTE_RGB.DRAGFILE_TEXT.with({ w: alpha }), 2);

        // Draw Message
        draw.fontSize = 48;
        const message = this.getDragFileMessage(data);
        await draw.textAlign(Vec2.ZERO, message, Vec2.CENTER, PALETTE_RGB.DRAGFILE_TEXT);
    }

    private getDragFileMessage(data: DragDropFile): string {
        const extension = data.name.split('.').pop()?.toLowerCase();

        if (!extension) return '不明なファイル形式です';
        if (extension === 'cafeitem') return 'ここに落としてアイテムパックを追加';
        if (extension === 'omucafe') return 'ここに落としてカフェパックを適用';
        if (IMAGE_EXTENSIONS.includes(extension)) return 'ここに落としてアイテムを追加';

        return '対応していないファイル形式です';
    }
}
