<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Gizmo } from '$lib/components/canvas/gizmo.js';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { MatrixStack } from '$lib/math/matrix-stack.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { DiscordOverlayApp, type Config, type UserConfig, type VoiceStateUser } from '../discord-overlay-app.js';
    import { createBackLightEffect } from '../effects/backlight.js';
    import { createBloomEffect } from '../effects/bloom.js';
    import { createShadowEffect } from '../effects/shadow.js';
    import type { Avatar, AvatarContext, Effect, RenderOptions } from '../pngtuber/avatar.js';
    import { PNGAvatar } from '../pngtuber/pngavatar.js';
    import { PNGTuber, type PNGTuberData } from '../pngtuber/pngtuber.js';
    import robo from '../robo.json';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from '../shaders.js';
    import { dragUser, heldAvatar } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    export let message: {type: 'loading'| 'failed', text: string} | null = null;
    export let showGrid = false;
    export let dimensions = { width: 1920, height: 1080, margin: 60 };
    export let view: Mat4 = Mat4.IDENTITY;
    const { voiceState, speakingState, config } = overlayApp;

    let defaultAvatar: PNGTuber;
    let gridProgram: GlProgram;
    let shadowEffect: Effect;
    let backlightEffect: Effect;
    let bloomEffect: Effect;
    let gizmo: Gizmo;

    async function resize(context: GlContext) {
        const { gl } = context;
        const matrices = new MatrixStack();
        setupViewMatrix(matrices, gl.canvas.width, gl.canvas.height);
        view = matrices.get();
    }

    async function init(context: GlContext) {
        defaultAvatar = await PNGTuber.load(context, robo);
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
        const entries = Object.entries($voiceState);
        for (const [, state] of entries) {
            await getAvatarByUser(context, state.user);
        }
        shadowEffect = await createShadowEffect(context, () => $config.effects.shadow);
        backlightEffect = await createBackLightEffect(context);
        bloomEffect = await createBloomEffect(context);
        gizmo = new Gizmo(context);
    }

    async function render(context: GlContext) {
        const entries = Object.entries($voiceState);

        const { gl } = context;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const matrices = new MatrixStack();
        setupViewMatrix(matrices, gl.canvas.width, gl.canvas.height);

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
                gridColorUniform.set(new Vec4(0.7, 0.7, 0.7, 1));
                const gridBackgroundUniform = gridProgram.getUniform('u_backgroundColor').asVec4();
                gridBackgroundUniform.set(new Vec4(0.9, 0.9, 0.9, 1));
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
                new Vec4(0, 0, 0, 0.1));
            gizmo.rectOutline(matrices.get(),
                -dimensions.width / 2,
                -dimensions.height / 2,
                dimensions.width / 2,
                dimensions.height / 2,
                new Vec4(0, 0, 0, 0.5));
        }

        const effects: Effect[] = [
            $config.effects.shadow.active && shadowEffect,
            $config.effects.backlightEffect.active && backlightEffect,
            $config.effects.bloom.active && bloomEffect,
        ].filter((it): it is Effect => !!it);
        const renderOptions: RenderOptions = {
            effects,
        }
        
        const toRender = await Promise.all(entries.filter(([id,]) => $config.users[id] && $config.users[id].show).map(async ([id, state]) => {
            const user = getUser(id);
            const avatar = await getAvatarByUser(context, state.user);
            return { id, state, user, avatar };
        }));
        toRender
            .sort((a, b) => {
                const xDiff = a.user.position[0] - b.user.position[0];
                const direction = $config.align.horizontal === 'end' ? 1 : -1;
                return xDiff * direction;
            })
            .map(({ id, state, user, avatar }, index) => {
                const speakState = $speakingState[id];
                const flipDirection = getFlipDirection();
                matrices.push();
                const position = getPosition($config, id, user, toRender.length, toRender.length - index - 1);
                if (showGrid && (user.position[0] !== position[0] || user.position[1] !== position[1])) {
                    $config.users[id].position = position;
                }
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
                matrices.translate(0, -scaleOffset, 0);
                matrices.translate(0, -scaleOffset, 0);
                if ($config.align.flip) {
                    matrices.scale(flipDirection.x, flipDirection.y, 1);
                }
                const avatarConfig = user.avatar && $config.avatars[user.avatar];
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
                    talking: speakState?.speaking || false,
                    ...state.voice_state,
                }, renderOptions);
                matrices.pop();
            });

        if ($heldAvatar) {
            const faceSize = 400;
            const avatarConfig = $config.avatars[$heldAvatar];
            gizmo.rect(Mat4.IDENTITY, -1, -1, 1, 1, new Vec4(0, 0, 0, 0.8));
            gizmo.rect(matrices.get(), -faceSize / 2, -faceSize / 2, faceSize / 2, faceSize / 2, new Vec4(1, 1, 1, 0.8));
            const { avatar } = await getAvatarById(context, $heldAvatar);
            const avatarContext = heldAvatarContext || avatar.create();
            heldAvatarContext = avatarContext;
            matrices.push();
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
            avatarContext.render(matrices, {
                talking: false,
                mute: false,
                deaf: false,
                self_mute: false,
                self_deaf: false,
                suppress: false,
            }, { effects: [] });
            matrices.pop();
            // draw offset center cross
            gizmo.rect(matrices.get(), -16, -4, 16, 4, new Vec4(1, 1, 1, 0.8));
            gizmo.rect(matrices.get(), -4, -16, 4, 16, new Vec4(1, 1, 1, 0.8));
            gizmo.rect(matrices.get(), -14, -2, 14, 2, new Vec4(0, 0, 0, 0.8));
            gizmo.rect(matrices.get(), -2, -14, 2, 14, new Vec4(0, 0, 0, 0.8));
            gizmo.rect(matrices.get(), -faceSize / 2, -faceSize / 2, faceSize / 2, faceSize / 2, new Vec4(1, 1, 1, 0.2));
            gizmo.rectOutline(matrices.get(), -faceSize / 2, -faceSize / 2, faceSize / 2, faceSize / 2, new Vec4(0, 0, 0, 1), 4);
            gizmo.rectOutline(matrices.get(), -faceSize / 2, -faceSize / 2, faceSize / 2, faceSize / 2, new Vec4(1, 1, 1, 1), 2);
            const stroke = 2;
            gizmo.triangle(matrices.get(), -faceSize / 2 - 100 - stroke, 0, -faceSize / 2 - 80 + stroke, -20 - stroke * 2, -faceSize / 2 - 80 + stroke, 20 + stroke * 2, new Vec4(0, 0, 0, 1));
            gizmo.rect(matrices.get(), -faceSize / 2 - 80 - stroke, -3 - stroke, -faceSize / 2 - 20 + stroke, 3 + stroke, new Vec4(0, 0, 0, 1));
            gizmo.triangle(matrices.get(), -faceSize / 2 - 100, 0, -faceSize / 2 - 80, -20, -faceSize / 2 - 80, 20, new Vec4(1, 1, 1, 1));
            gizmo.rect(matrices.get(), -faceSize / 2 - 80, -3, -faceSize / 2 - 20, 3, new Vec4(1, 1, 1, 1));
        } else {
            heldAvatarContext = null;
        }
    }

    let heldAvatarContext: AvatarContext | null = null;
    const lastPositions = new Map<string, Vec2>();

    function setupViewMatrix(matrices: MatrixStack, width: number, height: number) {
        matrices.orthographic(0, width, height, 0, -1, 1);
        matrices.translate(width / 2, height / 2, 0);
        if(showGrid) {
            const fitScale=Math.min((width - dimensions.margin) / dimensions.width, (height - dimensions.margin) / dimensions.height);
            matrices.scale(fitScale, fitScale,1);
        }
    }

    function getPosition(config: Config, id: string, user: UserConfig, length: number, index: number): [number, number] {
        if (!config.align.auto || $dragUser === id) {
            return user.position;
        }
        const { align: {horizontal, vertical, padding, spacing, scaling} } = config;
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
        const center = horizontal == 'middle';
        const offsetDirection = center ? new Vec2(
            1,
            0,
        ) : new Vec2(
            ALIGN[horizontal] - 0.5,
            0,
        ).normalize();
        const scale = scaling ? Math.min(1, 4 / length) : 1;
        const offset = offsetDirection.scale(spacing * scale);
        const position = start
            .add(offset.scale(center ? index - (length - 1) / 2 : -index))
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
        }
        const header = source.slice(0, 4).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
        const type = HEADER_MAP[header];
        if (type) {
            return type;
        }
        console.warn(`Unknown file type: ${header}`);
        return 'image/png';
    }

    async function createSourceElement(source: Uint8Array): Promise<HTMLImageElement> {
        const type = getFileType(source);
        const blob = new Blob([source], {type});
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        return img;
    }

    async function getAvatarById(gl: GlContext, avatarId: string): Promise<{key:string, avatar: Avatar}> {
        const avatarConfig = $config.avatars[avatarId];
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
                const baseElement = await createSourceElement(await overlayApp.getSource(avatarConfig.base));
                const active = avatarConfig.active && await createSourceElement(await overlayApp.getSource(avatarConfig.active));
                const deafened = avatarConfig.deafened && await createSourceElement(await overlayApp.getSource(avatarConfig.deafened));
                const muted = avatarConfig.muted && await createSourceElement(await overlayApp.getSource(avatarConfig.muted));
                const avatar = await PNGAvatar.load(gl, {
                    base: {
                        source: baseElement,
                        width: baseElement.width,
                        height: baseElement.height,
                    },
                    active: active && {
                        source: active,
                        width: active.width,
                        height: active.height,
                    },
                    deafened: deafened && {
                        source: deafened,
                        width: deafened.width,
                        height: deafened.height,
                    },
                    muted: muted && {
                        source: muted,
                        width: muted.width,
                        height: muted.height,
                    },
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

    async function getAvatarByUser(gl: GlContext, user: VoiceStateUser): Promise<AvatarContext> {
        const existing = contextCache.get(user.id);
        const userConfig = getUser(user.id);
        if (existing && existing.id === userConfig.avatar && existing.key === userConfig.avatar) {
            return existing.avatar;
        }
        if (!userConfig.avatar) {
            const avatar = defaultAvatar.create();
            contextCache.set(user.id, {id: 'default', key: '', avatar});
            return avatar;
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
            message = {
                type: 'failed',
                text: `${user.username}のアバターの読み込みに失敗しました: ${e}`,
            }
            setTimeout(() => {
                message = null;
            }, 5000);
            const avatar = defaultAvatar.create();
            contextCache.set(user.id, {id: 'failed', key: '', avatar});
            return avatar;
        }
    }

    function invalidateAvatarCache(config: Config) {
        for (const [id, user] of Object.entries(config.users)) {
            if (!user.avatar) {
                avatarCache.delete(id);
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
    <Canvas {init} {render} {resize}/>
</div>

<style lang="scss">
    .canvas {
        position: absolute;
        inset: 0;
    }
</style>
