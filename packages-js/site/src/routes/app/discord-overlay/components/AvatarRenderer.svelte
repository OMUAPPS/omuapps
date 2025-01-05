<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Gizmo } from '$lib/components/canvas/gizmo.js';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Axis } from '$lib/math/axis.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { MatrixStack } from '$lib/math/matrix-stack.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { PALETTE_HEX, PALETTE_RGB } from '../consts.js';
    import { DiscordOverlayApp, type Config, type UserConfig, type VoiceStateItem, type VoiceStateUser } from '../discord-overlay-app.js';
    import { createBackLightEffect } from '../effects/backlight.js';
    import { createBloomEffect } from '../effects/bloom.js';
    import { createShadowEffect } from '../effects/shadow.js';
    import { createSpeechEffect } from '../effects/speech.js';
    import type { Avatar, AvatarAction, AvatarContext, Effect, RenderOptions } from '../pngtuber/avatar.js';
    import { PNGAvatar } from '../pngtuber/pngavatar.js';
    import { PNGTuber, type PNGTuberData } from '../pngtuber/pngtuber.js';
    import { ReactiveAPI } from '../pngtuber/reactive.js';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from '../shaders.js';
    import { dragPosition, dragUser, isDraggingFinished, scaleFactor, selectedAvatar } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    export let message: {type: 'loading'| 'failed', text: string} | null = null;
    export let showGrid = false;
    export let dimensions = {
        width: 1920,
        height: 1080,
        margin: {
            left: 400,
            right: 340,
            top: 80,
            bottom: 80,
        },
    };
    export let view: Mat4 = Mat4.IDENTITY;
    const { voiceState, speakingState, config } = overlayApp;

    const DEFAULT_AVATAR_ACTION: AvatarAction = {
        id: 'held',
        talking: false,
        mute: false,
        deaf: false,
        self_mute: false,
        self_deaf: false,
        suppress: false,
    };

    let gridProgram: GlProgram;
    let shadowEffect: Effect;
    let backlightEffect: Effect;
    let bloomEffect: Effect;
    let speechEffect: Effect;
    let gizmo: Gizmo;

    async function resize(context: GlContext) {
        const { gl } = context;
        const matrices = new MatrixStack();
        setupViewMatrix(matrices, gl.canvas.width, gl.canvas.height);
        view = matrices.get();
        $scaleFactor = getScaleFactor(gl.canvas.width, gl.canvas.height);
    }

    async function init(context: GlContext) {
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
        const entries = Object.entries($voiceState);
        for (const [, state] of entries) {
            await getAvatarByUser(context, state.user);
        }
        speechEffect = await createSpeechEffect(context, () => $config.effects.speech);
        shadowEffect = await createShadowEffect(context, () => $config.effects.shadow);
        backlightEffect = await createBackLightEffect(context);
        bloomEffect = await createBloomEffect(context);
        gizmo = new Gizmo(context);
    }

    async function render(context: GlContext) {
        const entries = Object.entries($voiceState);

        const { gl } = context;
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const matrices = new MatrixStack();
        setupViewMatrix(matrices, gl.canvas.width, gl.canvas.height);
        if (!view.equals(matrices.get())) {
            view = matrices.get();
        }

        if (showGrid) {
            const vertexBuffer = context.createBuffer();
            vertexBuffer.bind(() => {
                vertexBuffer.setData(new Float32Array([
                    -1, -1, 0,
                    1, -1, 0,
                    -1, 1, 0,
                    -1, 1, 0,
                    1, -1, 0,
                    1, 1, 0,
                ]), 'static');
            });
            const uvBuffer = context.createBuffer();
            uvBuffer.bind(() => {
                uvBuffer.setData(new Float32Array([
                    0, 0,
                    1, 0,
                    0, 1,
                    0, 1,
                    1, 0,
                    1, 1,
                ]), 'static');
            });
    
            gridProgram.use(() => {
                const transformUniform = gridProgram.getUniform('u_transform').asMat4();
                const matrix = matrices.get().inverse();
                transformUniform.set(matrix);
                const gridColorUniform = gridProgram.getUniform('u_gridColor').asVec4();
                gridColorUniform.set(PALETTE_RGB.OUTLINE_1);
                const gridBackgroundUniform = gridProgram.getUniform('u_backgroundColor').asVec4();
                gridBackgroundUniform.set(PALETTE_RGB.BACKGROUND_1);
                const positionAttribute = gridProgram.getAttribute('a_position');
                positionAttribute.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = gridProgram.getAttribute('a_texcoord');
                uvAttribute.set(uvBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })

            gizmo.rect(matrices.get(),
                -dimensions.width / 2,
                -dimensions.height / 2,
                dimensions.width / 2,
                dimensions.height / 2,
                PALETTE_RGB.BACKGROUND_3);
            gizmo.rectOutline(matrices.get(),
                -dimensions.width / 2,
                -dimensions.height / 2,
                dimensions.width / 2,
                dimensions.height / 2,
                PALETTE_RGB.BACKGROUND_3);
        }

        const effects: Effect[] = [
            $config.effects.speech.active && speechEffect,
            $config.effects.shadow.active && shadowEffect,
            $config.effects.backlightEffect.active && backlightEffect,
            $config.effects.bloom.active && bloomEffect,
        ].filter((it): it is Effect => !!it);
        const renderOptions: RenderOptions = {
            effects,
        }
        
        const toRender: { id: string, state: VoiceStateItem, user: UserConfig, avatar: AvatarContext }[] = [];
        for (const [id, state] of entries) {
            if (!$config.users[id] || !$config.users[id].show) continue;
            const user = getUser(id);
            const avatar = await getAvatarByUser(context, state.user);
            toRender.push({ id, state, user, avatar });
        }
        toRender
            .sort((a, b) => {
                const axis = $config.align.direction === 'horizontal' ? 0 : 1;
                const xDiff = a.user.position[axis] - b.user.position[axis];
                const isCenter = $config.align.horizontal === 'middle' && $config.align.vertical === 'middle';
                const dir = $config.align.direction === 'horizontal' ? {
                    start: -1,
                    middle: -1,
                    end: 1,
                }[$config.align.horizontal] : {
                    start: -1,
                    middle: -1,
                    end: 1,
                }[$config.align.vertical];
                return xDiff * (isCenter ? -1 : 1) * dir;
            })
            .map(({ id, state, user, avatar }, index) => {
                const speakState = $speakingState[id];
                const flipDirection = getFlipDirection();
                const position = getPosition($config, id, user, toRender.length, toRender.length - index - 1);
                if (showGrid && (user.position[0] !== position[0] || user.position[1] !== position[1])) {
                    $config.users[id].position = position;
                }
                matrices.push();
                const last = lastPositions.get(id) || new Vec2(position[0], position[1]);
                const renderPosition = new Vec2(position[0], position[1]).lerp(last, 0.7);
                lastPositions.set(id, renderPosition);
                matrices.translate(renderPosition.x, renderPosition.y, 0);
                const scaleOffset = flipDirection.y > 0 ? $config.align.padding.bottom : -$config.align.padding.top;
                matrices.translate(0, scaleOffset, 0);
                matrices.scale(user.scale, user.scale, 1);
                matrices.scale(0.75, 0.75, 1);
                if ($config.align.scaling) {
                    const scaleFactor = Math.min(1, 4 / toRender.length);
                    matrices.scale(scaleFactor, scaleFactor, 1);
                }
                matrices.translate(0, -scaleOffset * 2, 0);
                const avatarConfig = user.avatar && $config.avatars[user.avatar] || null;
                if ($config.align.flip) {
                    matrices.scale(flipDirection.x, flipDirection.y, 1);
                    if ($config.align.direction === 'vertical') {
                        const rotation = {
                            start: -90,
                            middle: 0,
                            end: -90,
                        }[$config.align.horizontal];
                        matrices.rotate(Axis.Z_POS.rotateDeg(avatarConfig?.type === 'pngtuber' ? rotation : -rotation));
                    }
                }
                if (avatarConfig) {
                    const position = Vec2.fromArray(avatarConfig.offset);
                    matrices.translate(position.x, position.y, 0);
                    matrices.scale(avatarConfig.scale, avatarConfig.scale, 1);
                    if (avatarConfig.type === 'pngtuber') {
                        if (avatarConfig.flipHorizontal) {
                            matrices.scale(-1, 1, 1);
                        }
                        if (avatarConfig.flipVertical) {
                            matrices.scale(1, -1, 1);
                        }
                    }
                }
                avatar.render(matrices, {
                    id: state.user.id,
                    talking: speakState?.speaking || false,
                    ...state.voice_state,
                }, renderOptions);
                matrices.pop();
            });

        if ($selectedAvatar && $config.avatars[$selectedAvatar]) {
            matrices.push();
            matrices.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
            matrices.translate(gl.canvas.width / 2, gl.canvas.height / 2, 0);
            const scaleFactor = getScaleFactor(gl.canvas.width, gl.canvas.height);
            matrices.scale(scaleFactor, scaleFactor, 1);
            const faceSize = 400;
            const avatarConfig = $config.avatars[$selectedAvatar];
            gizmo.rect(Mat4.IDENTITY, -1, -1, 1, 1, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);
            gizmo.circle(matrices.get(), 0, 0, faceSize / 2, PALETTE_RGB.BACKGROUND_1_TRANSPARENT, 32);
            const { avatar } = await getAvatarById(context, $selectedAvatar);
            const avatarContext = heldAvatarContext || avatar.create();
            heldAvatarContext = avatarContext;
            matrices.push();
            const offset = Vec2.fromArray(avatarConfig.offset);
            matrices.translate(offset.x, offset.y, 0);
            matrices.scale(avatarConfig.scale, avatarConfig.scale, 1);
            if (avatarConfig.type === 'pngtuber') {
                if (avatarConfig.flipHorizontal) {
                    matrices.scale(-1, 1, 1);
                }
                if (avatarConfig.flipVertical) {
                    matrices.scale(1, -1, 1);
                }
            }
            avatarContext.render(matrices, DEFAULT_AVATAR_ACTION, { effects: [] });
            matrices.pop();
            renderCross(matrices, 0, 0, 16, 2);
            gizmo.circleOutline(matrices.get(), 0, 0, faceSize / 2, PALETTE_RGB.BACKGROUND_2_TRANSPARENT, 6, 32);
            gizmo.circleOutline(matrices.get(), 0, 0, faceSize / 2, PALETTE_RGB.ACCENT, 3, 32);
            const stroke = 2;
            gizmo.triangle(matrices.get(), -faceSize / 2 - 100 - stroke, 0, -faceSize / 2 - 80 + stroke, -20 - stroke * 2, -faceSize / 2 - 80 + stroke, 20 + stroke * 2, PALETTE_RGB.BACKGROUND_1);
            gizmo.rect(matrices.get(), -faceSize / 2 - 80 - stroke, -3 - stroke, -faceSize / 2 - 20 + stroke, 3 + stroke, PALETTE_RGB.BACKGROUND_2);
            gizmo.triangle(matrices.get(), -faceSize / 2 - 100, 0, -faceSize / 2 - 80, -20, -faceSize / 2 - 80, 20, PALETTE_RGB.ACCENT);
            gizmo.rect(matrices.get(), -faceSize / 2 - 80, -3, -faceSize / 2 - 20, 3, PALETTE_RGB.ACCENT);
            matrices.pop();
        } else {
            heldAvatarContext = null;
        }
    }

    function renderCross(matrices: MatrixStack, x: number, y: number, size: number, outline: number) {
        gizmo.rect(matrices.get(), -size - outline, -outline * 2, size + outline, outline * 2, PALETTE_RGB.BACKGROUND_2);
        gizmo.rect(matrices.get(), -outline * 2, -size - outline, outline * 2, size + outline, PALETTE_RGB.BACKGROUND_2);
        gizmo.rect(matrices.get(), -size, -outline, size, outline, PALETTE_RGB.ACCENT);
        gizmo.rect(matrices.get(), -outline, -size, outline, size, PALETTE_RGB.ACCENT);
    }

    function worldToScreen(view: Mat4, point: Vec2, width: number, height: number) {
        const screen = view.xform2(point);
        const zeroToOne = screen.mul(new Vec2(0.5, -0.5)).add(new Vec2(0.5, 0.5));
        const screenSpace = zeroToOne.mul(new Vec2(width, height));
        return screenSpace;
    }

    function renderTooltip(context: CanvasRenderingContext2D, text: string, position: Vec2) {
        const size = context.measureText(text);
        context.fillStyle = PALETTE_HEX.TOOLTIP_BACKGROUND;
        const padding = 10;
        const bgLeft = {
            center: position.x - size.width / 2,
            left: position.x,
            start: position.x,
            end: position.x - size.width,
            right: position.x - size.width,
        }[context.textAlign];
        context.fillRect(bgLeft - padding, position.y - padding, size.width + padding * 2, 12 + padding);
        context.fillStyle = PALETTE_HEX.TOOLTIP_TEXT;
        context.fillText(text, position.x, position.y + 2);
    }

    async function render2D(context: CanvasRenderingContext2D) {
        if ($selectedAvatar) return;
        if (showGrid) {
            if ($config.align.auto) {
                renderAlignHint(context);
            } else {
                renderAlignHintAuto(context);
            }
            renderHideAreaHint(context);
        }
        renderNametags(context);
        context.globalAlpha = 1;
        if ($isDraggingFinished) {
            $isDraggingFinished = false;
            $dragPosition = null;
        }
    }

    function renderAlignHint(context: CanvasRenderingContext2D) {
        if (!$dragPosition) return;
        const matrices = new MatrixStack();
        setupViewMatrix(matrices, context.canvas.width, context.canvas.height);
        const view = matrices.get();
        const worldBounds = new AABB2(
            new Vec2(-dimensions.width / 2, -dimensions.height / 2),
            new Vec2(dimensions.width / 2, dimensions.height / 2),
        );
        const screenBounds = new AABB2(
            worldToScreen(view, worldBounds.min, context.canvas.width, context.canvas.height),
            worldToScreen(view, worldBounds.max, context.canvas.width, context.canvas.height),
        );
        const visibleBounds = new AABB2(
            new Vec2(60, dimensions.margin.top),
            new Vec2(context.canvas.width - dimensions.margin.right, context.canvas.height - dimensions.margin.bottom),
        );
        const a = 20;
        const c = 100;
        const bounds = screenBounds.overlap(visibleBounds).expand(Vec2.ONE.scale(a + 10));
        const color = PALETTE_HEX.OUTLINE_2;
        const directions = [
            {origin: bounds.min, direction: new Vec2(-1, -1), name: '左上'},
            {origin: new Vec2(bounds.min.x, bounds.max.y), direction: new Vec2(-1, 1), name: '左下'},
            {origin: bounds.max, direction: new Vec2(1, 1), name: '右下'},
            {origin: new Vec2(bounds.max.x, bounds.min.y), direction: new Vec2(1, -1), name: '右上'},
        ]
        for (const {origin, direction, name} of directions) {
            const dirFromCenter = bounds.center().sub($dragPosition).normalize();
            const dotFromCenter = dirFromCenter.dot(direction);
            const offset = origin.sub($dragPosition).normalize();
            const offsetRotatedToDirection = offset.mul(direction.scale(-1));
            const dot = offsetRotatedToDirection.dot(Vec2.ONE);
            const inDirection = dot > -1;
            const left = new Vec2(-direction.y, direction.x);
            const dir = offsetRotatedToDirection.x < offsetRotatedToDirection.y ? 'horizontal' : 'vertical';
            context.globalAlpha = inDirection && dotFromCenter <= -1 ? 1 : 0.3;
            const b = 4;
            context.fillStyle = dir === 'vertical' && inDirection && dotFromCenter <= -1 ? PALETTE_HEX.ACCENT : color;
            context.fillRect(origin.x - b / 2, origin.y - b * direction.y, b, -c * direction.y);
            const verticalStartX = origin.x - b / 2 + b - 1.5;
            const verticalStartY = origin.y - b * direction.y - (c + 10) * direction.y;
            
            context.beginPath();
            context.moveTo(verticalStartX, verticalStartY);
            context.lineTo(verticalStartX + 10 * left.x, verticalStartY + 10 * direction.y);
            context.lineTo(verticalStartX - 10 * left.x, verticalStartY + 10 * direction.y);
            context.fill();
            context.closePath();
            context.fillStyle = dir === 'horizontal' && inDirection && dotFromCenter <= -1 ? PALETTE_HEX.ACCENT : color;
            context.fillRect(origin.x - b * direction.x, origin.y - b / 2, -c * direction.x, b);
            const horizontalStartX = origin.x - b * direction.x - (c + 10) * direction.x;
            const horizontalStartY = origin.y - b / 2 + b - 1.5;
            context.beginPath();
            context.moveTo(horizontalStartX, horizontalStartY);
            context.lineTo(horizontalStartX + 10 * direction.x, horizontalStartY + 10 * left.y);
            context.lineTo(horizontalStartX + 10 * direction.x, horizontalStartY - 10 * left.y);
            context.fill();
            context.closePath();
            context.globalAlpha = 1;
            if (dotFromCenter > -1) continue;
            if (!inDirection) continue;
            context.fillStyle = PALETTE_HEX.ACCENT;
            context.font = 'bold 12px "Noto Sans JP"';
            context.textAlign = direction.x === 0 ? 'center' : direction.x > 0 ? 'end' : 'start';
            context.textBaseline = 'middle';
            const text = `${name} から ${dir === 'vertical' ? '縦' : '横'} に揃える`;
            renderTooltip(context, text, origin.add(Vec2.UP.scale((direction.y || -1) * 20)));
            if (!$isDraggingFinished) continue;
            $config.align.horizontal = direction.x > 0 ? 'end' : 'start';
            $config.align.vertical = direction.y > 0 ? 'end' : 'start';
            $config.align.direction = dir;
            $dragPosition = null;
            return;
        }
    }

    function renderAlignHintAuto(context: CanvasRenderingContext2D) {
        if (!$dragPosition) return;
        const matrices = new MatrixStack();
        setupViewMatrix(matrices, context.canvas.width, context.canvas.height);
        const view = matrices.get();
        const worldBounds = new AABB2(
            new Vec2(-dimensions.width / 2, -dimensions.height / 2),
            new Vec2(dimensions.width / 2, dimensions.height / 2),
        );
        const screenBounds = new AABB2(
            worldToScreen(view, worldBounds.min, context.canvas.width, context.canvas.height),
            worldToScreen(view, worldBounds.max, context.canvas.width, context.canvas.height),
        );
        const visibleBounds = new AABB2(
            new Vec2(60, dimensions.margin.top),
            new Vec2(context.canvas.width - dimensions.margin.right, context.canvas.height - dimensions.margin.bottom),
        );
        const a = 20;
        const bounds = screenBounds.overlap(visibleBounds).expand(Vec2.ONE.scale(a + 10));
        const center = bounds.center();
        const directions = [
            {origin: new Vec2(center.x, bounds.min.y), direction: Vec2.DOWN, name: '上'},
            {origin: new Vec2(center.x, bounds.max.y), direction: Vec2.UP, name: '下'},
            {origin: new Vec2(bounds.min.x, center.y), direction: Vec2.LEFT, name: '左'},
            {origin: new Vec2(bounds.max.x, center.y), direction: Vec2.RIGHT, name: '右'},
        ]
        for (const {origin, direction, name} of directions) {
            const offset = origin.sub($dragPosition).normalize();
            const inDirection = offset.dot(direction) < 0;
            const directionLeft = direction.turnLeft();
            const lineStart = origin.add(directionLeft.scale(10));
            const lineEnd = origin.add(directionLeft.scale(-10));
            context.strokeStyle = inDirection ? PALETTE_HEX.ACCENT : PALETTE_HEX.OUTLINE_1;
            context.beginPath();
            context.moveTo(lineStart.x, lineStart.y);
            context.lineTo(lineEnd.x, lineEnd.y);
            context.moveTo(origin.x - direction.x * 10, origin.y - direction.y * 10);
            context.lineTo(origin.x - direction.x * 20, origin.y - direction.y * 20);
            context.stroke();
            context.closePath();
            if (!inDirection) continue;
            
            context.fillStyle = PALETTE_HEX.ACCENT;
            context.font = 'bold 14px "Noto Sans JP"';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            const text = `${name} に揃える`;
            renderTooltip(context, text, origin.add(Vec2.UP.scale((direction.y || -1) * 20)));
            if (!$isDraggingFinished) continue;
            $config.align.horizontal = direction.x === 0 ? 'middle' : direction.x > 0 ? 'end' : 'start';
            $config.align.vertical = direction.y === 0 ? 'middle' : direction.y > 0 ? 'end' : 'start';
            $config.align.direction = direction.y === 0 ? 'vertical' : 'horizontal';
            $dragPosition = null;
            return;
        }
    }

    function renderHideAreaHint(context: CanvasRenderingContext2D) {
        const { width, height } = context.canvas;
        const margin = 10;
        const hideAreaBounds = new AABB2(
            new Vec2(width - 240 + margin, margin),
            new Vec2(width - margin, height - margin),
        );
        const hideAreaCenter = hideAreaBounds.center();
        const isInHideArea = $dragPosition && hideAreaBounds.contains($dragPosition);
        const hasHideUser = Object.keys($speakingState).some(id => !$config.users[id]?.show);
        context.globalAlpha = hasHideUser || $dragPosition ? 1 : 0.6;
        context.fillStyle = $dragPosition ? PALETTE_HEX.BACKGROUND_2 : PALETTE_HEX.BACKGROUND_2_TRANSPARENT;
        context.fillRect(width - 240, margin, 240 - margin, height - margin * 2);
        if ($dragUser) {
            context.strokeStyle = isInHideArea ? PALETTE_HEX.ACCENT : PALETTE_HEX.OUTLINE_1;
            const offset = 4;
            context.lineWidth = 2;
            context.strokeRect(width - 240 + offset, margin + offset, 240 - margin - offset * 2, height - margin * 2 - offset * 2);
        }
        if ($dragUser) {
            context.fillStyle = PALETTE_HEX.ACCENT;
            context.strokeStyle = 'white';
            context.lineWidth = 2;
            context.font = 'bold 14px "Noto Sans JP"';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText('ここにドラッグして非表示', hideAreaCenter.x, hideAreaCenter.y);
        }
        context.globalAlpha = 1;
    }

    function renderNametags(context: CanvasRenderingContext2D) {
        if (!$config.show_name_tags) return;
        const matrices = new MatrixStack();
        setupViewMatrix(matrices, context.canvas.width, context.canvas.height);
        const view = matrices.get();
        const entries = Object.entries($voiceState);
        const scaleFactor = getScaleFactor(context.canvas.width, context.canvas.height);
        for (const [id, state] of entries) {
            const user = getUser(id);
            if (!user.show) {
                continue;
            }
            const position = lastPositions.get(id) || new Vec2(0, 0);
            const renderPosition = view.xform2(position);
            const fontSize = 28 * scaleFactor;
            const offset = $config.align.vertical === 'start' ? -44 : 74 * scaleFactor;
            context.font = `bold ${fontSize}px "Noto Sans JP"`;
            context.fillStyle = 'white';
            context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            context.lineWidth = 6 * scaleFactor;
            context.lineJoin = 'round';
            context.textAlign = 'center';
            context.textBaseline = 'top';
            const size = context.measureText(state.nick);
            const maxWidth = 200 * scaleFactor;
            const scale = Math.min(1, maxWidth / size.width);
            context.font = `bold ${fontSize * scale}px "Noto Sans JP"`;
            context.strokeText(
                state.nick,
                renderPosition.x * 0.5 * context.canvas.width + context.canvas.width / 2,
                context.canvas.height / 2 - renderPosition.y * 0.5 * context.canvas.height + offset
            );
            context.fillText(
                state.nick,
                renderPosition.x * 0.5 * context.canvas.width + context.canvas.width / 2,
                context.canvas.height / 2 - renderPosition.y * 0.5 * context.canvas.height + offset
            );
        }
    }

    let heldAvatarContext: AvatarContext | null = null;
    const lastPositions = new Map<string, Vec2>();

    function getScaleFactor(width: number, height: number): number {
        const MIN_SCALE_FACTOR = 1 / 3;
        if(showGrid) {
            if ($config.align.auto) {
                const widthScale = (width - (dimensions.margin.left + dimensions.margin.right)) / dimensions.width;
                const heightScale = (height - (dimensions.margin.top + dimensions.margin.bottom)) / dimensions.height;
                return Math.max(MIN_SCALE_FACTOR, Math.min(widthScale, heightScale));
            }
            const { margin } = dimensions;
            return Math.max(MIN_SCALE_FACTOR, Math.min(
                (width - (margin.left + margin.right) / 2) / dimensions.width,
                (height - (margin.top + margin.bottom) / 2) / dimensions.height,
            ));
        }
        return 1;
    }

    function setupViewMatrix(matrices: MatrixStack, width: number, height: number) {
        matrices.orthographic(0, width, height, 0, -1, 1);
        if (!showGrid) {
            matrices.translate(width / 2, height / 2, 0);
            return;
        }
        const { width: w, height: h, margin } = dimensions;
        const align: {
            horizontal: 'start' | 'middle' | 'end',
            vertical: 'start' | 'middle' | 'end',
        } = $config.align.auto ? $config.align : {
            horizontal: 'middle',
            vertical: 'middle',
        };
        const offset = new Vec2(
            {
                start: w / 2 + margin.left,
                middle: width / 2,
                end: width - w / 2 - margin.right,
            }[align.horizontal],
            {
                start: h / 2 + h / 4 + margin.top,
                middle: height / 2,
                end: height - h / 2 - h / 4 - margin.bottom,
            }[align.vertical],
        );
        const scaleOrigin = new Vec2(
            {
                start: margin.left,
                middle: width / 2,
                end: width - margin.right,
            }[align.horizontal],
            {
                start: Math.max(margin.top, height / 2 - h / 4),
                middle: height / 2,
                end: Math.min(height - margin.bottom, height / 2 + h / 4),
            }[align.vertical],
        );
        const scaleFactor = getScaleFactor(width, height);
        matrices.translate(scaleOrigin.x, scaleOrigin.y, 0);
        matrices.scale(scaleFactor, scaleFactor, 1);
        matrices.translate(-scaleOrigin.x, -scaleOrigin.y, 0);
        matrices.translate(offset.x, offset.y, 0);
    }

    function getPosition(config: Config, id: string, user: UserConfig, length: number, index: number): [number, number] {
        if (!config.align.auto || $dragUser === id) {
            return user.position;
        }
        const { align: {horizontal, vertical, padding, spacing, scaling, direction} } = config;
        const bounds = new AABB2(
            new Vec2(-dimensions.width / 2, -dimensions.height / 2).add(new Vec2(padding.left, padding.top)),
            new Vec2(dimensions.width / 2, dimensions.height / 2).add(new Vec2(-padding.right, -padding.bottom)),
        );
        const ALIGN = {
            start: 0,
            middle: 0.5,
            end: 1,
        }
        const uv = new Vec2(
            ALIGN[horizontal],
            ALIGN[vertical],
        );
        const start = bounds.at(uv);
        const center = horizontal == 'middle' && vertical == 'middle';
        const offsetDirection = new Vec2(
            direction === 'horizontal' ? 1 : 0,
            direction === 'vertical' ? 1 : 0,
        ).mul(center ? Vec2.ONE : new Vec2(
            {
                start: 1,
                middle: 1,
                end: -1,
            }[horizontal],
            {
                start: 1,
                middle: 1,
                end: -1,
            }[vertical],
        ));
        const scale = scaling ? Math.min(1, 4 / length) : 1;
        const offset = offsetDirection.scale(spacing * scale);
        const position = start
            .add(offset.scale(horizontal === 'middle' || vertical === 'middle' ? index - (length - 1) / 2 : index))
            .toArray();
        return position;
    }

    function getFlipDirection(): Vec2 {
        const { align: {horizontal, vertical} } = $config;
        const flipHorizontal = horizontal === 'start';
        const flipVertical = vertical === 'start';
        return new Vec2(
            flipHorizontal ? -1 : 1,
            flipVertical ? -1 : 1,
        );
    }
    
    const avatarCache = new Map<string, {key: string, avatar: Avatar}>();
    const contextCache = new Map<string, {id: string, key: string, avatar: AvatarContext}>();

    function getFileType(source: Uint8Array): string {
        const HEADER_MAP: Record<string, string | undefined> = {
            '89504e47': 'image/png',
            '47494638': 'image/gif',
            'ffd8ffe0': 'image/jpeg',
            'ffd8ffe1': 'image/jpeg',
            'ffd8ffe2': 'image/jpeg',
            'ffd8ffe3': 'image/jpeg',
            'ffd8ffe8': 'image/jpeg',
            '52494646': 'image/webp',
        }
        const header = source.slice(0, 4).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
        const type = HEADER_MAP[header];
        if (type) {
            return type;
        }
        console.warn(`Unknown file type: ${header}`);
        return 'image/png';
    }

    async function createSourceElement(source: Uint8Array): Promise<{width: number, height: number, image: HTMLImageElement}> {
        const type = getFileType(source);
        const blob = new Blob([source], {type});
        const url = URL.createObjectURL(blob);
        const image = document.createElement('img');
        image.src = url;
        await image.decode();
        return {
            width: image.width,
            height: image.height,
            image,
        };
    }

    async function getAvatarById(gl: GlContext, avatarId: string): Promise<{key:string, avatar: Avatar}> {
        const avatarConfig = $config.avatars[avatarId];
        if (!avatarConfig) {
            throw new Error(`Avatar not found: ${avatarId}`);
        }
        const existing = avatarCache.get(avatarId);
        if (existing && existing.key === avatarConfig.key) {
            return existing;
        }
        let parsedData: PNGTuberData;
        const avatarType = avatarConfig.type;
        if (avatarType === 'pngtuber') {
            try {
                const buffer = await overlayApp.getSource(avatarConfig.source);
                parsedData = JSON.parse(new TextDecoder().decode(buffer));
                const avatar = await PNGTuber.load(gl, parsedData);
                avatarCache.set(avatarId, {key: avatarConfig.key, avatar});
                return {key: avatarConfig.key, avatar};
            } catch (e) {
                console.error(e);
                throw new Error(`Failed to load avatar: ${e}`);
            }
        } else if (avatarType === 'png') {
            try {
                const base = await createSourceElement(await overlayApp.getSource(avatarConfig.base));
                const active = avatarConfig.active && await createSourceElement(await overlayApp.getSource(avatarConfig.active));
                const deafened = avatarConfig.deafened && await createSourceElement(await overlayApp.getSource(avatarConfig.deafened));
                const muted = avatarConfig.muted && await createSourceElement(await overlayApp.getSource(avatarConfig.muted));
                const avatar = await PNGAvatar.load(gl, {
                    base,
                    active,
                    deafened,
                    muted,
                });
                avatarCache.set(avatarId, {key: avatarConfig.key, avatar});
                return {key: avatarConfig.key, avatar};
            } catch (e) {
                console.error(e);
                throw new Error(`Failed to load avatar: ${e}`);
            }
        } else {
            throw new Error(`Unknown avatar type: ${avatarType}`);
        }
    }

    async function getReactiveAvatar(gl: GlContext, avatarId: string, userId: string): Promise<Avatar | null> {
        if (!$config.user_id) {
            throw new Error('User ID is not set');
        }
        async function proxy(url: string) {
            try {
                const proxyUrl = overlayApp.omu.assets.proxy(url);
                return await window.fetch(proxyUrl);
            } catch (e) {
                console.error(e);
                throw e;
            }
        }
        const api = new ReactiveAPI($config.user_id, (url: string) => proxy(url));
        const user = await api.user(userId);
        const model = user.activeModelID !== 'always' && await api.model(user.activeModelID);
        const override = await api.override(userId);
        const modelData = {
            ...model,
            ...override,
        }
        if (!modelData.inactive) {
            return null;
        }
        $config.avatars[avatarId] = {
            type: 'png',
            key: '',
            offset: [0, 0],
            scale: 1,
            base: {
                type: 'url',
                url: modelData.inactive,
            },
            active: modelData.speaking ? {
                type: 'url',
                url: modelData.speaking,
            } : undefined,
            deafened: modelData.deafened ? {
                type: 'url',
                url: modelData.deafened,
            } : undefined,
            muted: modelData.muted ? {
                type: 'url',
                url: modelData.muted,
            } : undefined,
        }
        const base = await createSourceElement(await proxy(modelData.inactive).then(res => res.arrayBuffer()).then(buffer => new Uint8Array(buffer)));
        const active = await createSourceElement(await proxy(modelData.speaking).then(res => res.arrayBuffer()).then(buffer => new Uint8Array(buffer)));
        const deafened = await createSourceElement(await proxy(modelData.deafened).then(res => res.arrayBuffer()).then(buffer => new Uint8Array(buffer)));
        const muted = await createSourceElement(await proxy(modelData.muted).then(res => res.arrayBuffer()).then(buffer => new Uint8Array(buffer)));
        const avatar = await PNGAvatar.load(gl, {
            base,
            active,
            deafened,
            muted,
        });
        return avatar;
    }

    async function createDefaultAvatar(gl: GlContext, user: VoiceStateUser): Promise<AvatarContext> {
        const url = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        const source = await window.fetch(url).then(res => res.arrayBuffer()).then(buffer => new Uint8Array(buffer));
        const base = await createSourceElement(source);
        const avatar = await PNGAvatar.load(gl, {
            base,
        });
        return avatar.create();
    }

    async function getAvatarByUser(gl: GlContext, user: VoiceStateUser): Promise<AvatarContext> {
        const existing = contextCache.get(user.id);
        const userConfig = getUser(user.id);
        const avatarConfig = userConfig.avatar && $config.avatars[userConfig.avatar];
        if (existing && existing.id === userConfig.avatar && avatarConfig && existing.key === avatarConfig.key) {
            return existing.avatar;
        }
        if (existing && existing.id === 'default' && !userConfig.avatar) {
            return existing.avatar;
        }
        if (!userConfig.avatar) {
            try {
                if ($config.reactive.enabled) {
                    const avatarId = user.id;
                    const reactiveAvatar = await getReactiveAvatar(gl, avatarId, user.id);
                    if (reactiveAvatar) {
                        $config.users[user.id].avatar = avatarId;
                        const context = reactiveAvatar.create();
                        contextCache.set(avatarId, {id: user.id, key: '', avatar: context});
                        return context;
                    }
                }
                const context = await createDefaultAvatar(gl, user);
                contextCache.set(user.id, {id: 'default', key: '', avatar: context});
                return context;
            } catch (e) {
                console.error(e);
                const context = await createDefaultAvatar(gl, user);
                contextCache.set(user.id, {id: 'default', key: '', avatar: context});
                return context;
            }
        }
        message = {
            type: 'loading',
            text: `${user.username}のアバターを読み込み中...`,
        }
        try {
            const { key, avatar } = await getAvatarById(gl, userConfig.avatar);
            message = null;
            const context = avatar.create();
            contextCache.set(user.id, {id: userConfig.avatar, key, avatar: context});
            return context;
        } catch (e) {
            console.error(e);
            message = {
                type: 'failed',
                text: `${user.username}のアバターの読み込みに失敗しました: ${e}`,
            }
            setTimeout(() => {
                message = null;
            }, 5000);
        }
        const context = await createDefaultAvatar(gl, user);
        contextCache.set(user.id, {id: 'default', key: '', avatar: context});
        return context;
    }

    function invalidateAvatarCache(config: Config) {
        for (const [id, user] of Object.entries(config.users)) {
            if (!user.avatar) {
                avatarCache.delete(id);
            }
            if (!user.show) {
                lastPositions.delete(id);
            }
        }
    }

    $: {
        invalidateAvatarCache($config);
    }

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = {
                show: true,
                position: [0, 0],
                scale: 1,
                avatar: null,
            };
            $config.users[id] = user;
        }
        return user;
    }

    $: Object.keys($voiceState).forEach(id => {
        getUser(id);
    });
</script>

<div class="canvas">
    <Canvas {init} {render} {render2D} {resize} />
</div>

<style lang="scss">
    .canvas {
        position: absolute;
        inset: 0;
    }
</style>
