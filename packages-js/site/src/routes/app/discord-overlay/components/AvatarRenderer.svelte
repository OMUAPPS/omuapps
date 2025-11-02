<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import { type GlContext } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { comparator } from '$lib/helper.js';
    import { TAU } from '$lib/math/math.js';
    import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { Timer } from '$lib/timer.js';
    import { PALETTE_RGB } from '../consts.js';
    import { DiscordOverlayApp, type AvatarConfig, type UserConfig, type VoiceStateItem, type VoiceStateUser } from '../discord-overlay-app.js';
    import { createBackLightEffect } from '../effects/backlight.js';
    import { createBloomEffect } from '../effects/bloom.js';
    import { createShadowEffect } from '../effects/shadow.js';
    import { createSpeechEffect } from '../effects/speech.js';
    import type { Avatar, AvatarContext, Effect, RenderOptions } from '../pngtuber/avatar.js';
    import { PNGAvatar } from '../pngtuber/pngavatar.js';
    import { PNGTuber, type PNGTuberData } from '../pngtuber/pngtuber.js';
    import { dragState, scaleFactor, selectedAvatar, view } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
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
    const { voiceState, speakingState, config } = overlayApp;

    let context: GlContext;
    let matrices = new Matrices();
    let draw: Draw;
    let timer = new Timer();

    async function resize() {
        $view = matrices.get();
    }

    let shadowEffect: Effect;
    let backlightEffect: Effect;
    let bloomEffect: Effect;
    let speechEffect: Effect;

    async function init(ctx: GlContext) {
        context = ctx;
        matrices = new Matrices();
        draw = new Draw(matrices, ctx);
        speechEffect = await createSpeechEffect(context, () => $config.effects.speech);
        shadowEffect = await createShadowEffect(context, () => $config.effects.shadow);
        backlightEffect = await createBackLightEffect(context);
        bloomEffect = await createBloomEffect(context);
    }

    function setupMatrices() {
        const { gl } = context;
        const { width, height } = gl.canvas;
        matrices.identity();
        matrices.projection.orthographic(0, 0, width, height, -1, 1);
        if (overlayApp.isOnAsset()) {
            return;
        }
        const start = new Vec2(50, 150);
        const end = new Vec2(50, 150);
        const screen = new Vec2(width, height);
        const target = new Vec2(dimensions.width, dimensions.height);
        const inner = screen.sub(start).sub(end);
        const scaleVector = inner.div(target);
        const scaleFactor = Math.min(scaleVector.x, scaleVector.y);
        matrices.view.translate(start.x, start.y, 0);
        const space = inner.sub(target.scale(scaleFactor)).scale(0.5);
        matrices.view.translate(space.x, space.y, 0);
        matrices.view.scale(scaleFactor, scaleFactor, scaleFactor);
    }

    async function render(context: GlContext) {
        const { gl } = context;
        const { width, height } = gl.canvas;
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND);
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.viewport(0, 0, width, height);

        setupMatrices();
        $view = matrices.get();

        if (overlayApp.isOnClient()) {
            draw.rectangle(0, 0, dimensions.width, dimensions.height, new Vec4(1, 1, 1, 1));
        }
        await drawAvatars();
        await drawScreen();
        timer.reset();
    }

    type ModelState = {
        type: 'unloaded';
    } | {
        type: 'loading';
    } | {
        type: 'loaded';
        cacheKey: string;
        avatar: Avatar;
        getConfig(): AvatarConfig | undefined;
    } | {
        type: 'failed';
        reason: {
            type: 'not_found';
            id: string;
        };
    };
    type AvatarState = {
        type: 'unloaded';
    } | {
        type: 'loading';
    } | {
        type: 'loaded';
        context: AvatarContext;
        prevPos: Vec2Like;
        cacheKey: string;
        getConfig(): AvatarConfig | undefined;
    } | {
        type: 'failed';
        reason: {
            type: 'no_user_found';
            id: string;
        };
    } | {
        type: 'no_avatar';
    };

    let models: Record<string, ModelState> = {};

    async function loadAvatarModelByConfig(avatar: AvatarConfig): Promise<Avatar> {
        let parsedData: PNGTuberData;
        if (avatar.type === 'pngtuber') {
            const buffer = await overlayApp.getSource(avatar.source);
            parsedData = JSON.parse(new TextDecoder().decode(buffer));
            const model = await PNGTuber.load(context, parsedData);
            return model;
        } else if (avatar.type === 'png') {
            const base = await overlayApp.getSource(avatar.base);
            const active = avatar.active && await overlayApp.getSource(avatar.active);
            const deafened = avatar.deafened && await overlayApp.getSource(avatar.deafened);
            const muted = avatar.muted && await overlayApp.getSource(avatar.muted);
            const model = await PNGAvatar.load(context, {
                base,
                active,
                deafened,
                muted,
            });
            return model;
        } else {
            throw new Error(`Unknown avatar type ${JSON.stringify(avatar)}`);
        }
    }

    function loadAvatarModelById(id: string): ModelState {
        let state = models[id] ?? { type: 'unloaded' };
        const avatar = $config.avatars[id];
        if (!avatar) return {
            type: 'failed',
            reason: { type: 'not_found', id },
        };
        const cacheKey = `avatar:${id}-${avatar.type}-${avatar.key}`;
        if (state.type === 'loaded') {
            if (state.cacheKey !== cacheKey) {
                state = { type: 'unloaded' };
            }
        }
        if (state.type === 'unloaded') {
            state = {
                type: 'loading',
            };
            loadAvatarModelByConfig(avatar).then((model) => {
                models[id] = {
                    type: 'loaded',
                    cacheKey,
                    avatar: model,
                    getConfig: () => $config.avatars[id],
                };
            });
        }
        models[id] = state;
        return state;
    }

    let avatars: Record<string, AvatarState> = {};

    async function createDefaultAvatar(url: string) {
        const base = await overlayApp.getSource({ type: 'url', url });
        const model = await PNGAvatar.load(context, {
            base,
        });
        return model;
    }

    type AvatarCacheKey<T extends string = string, K extends string = string> = `${T}:${K}`;

    function getAvatarCacheKeyByVoiceState(config: UserConfig, user: VoiceStateUser): AvatarCacheKey {
        if (!config.avatar) {
            return user.avatar ? `discord:${user.id}/${user.avatar}` : 'discord:default';
        }
        const avatar = $config.avatars[config.avatar];
        return avatar ? `avatar:${config.avatar}-${avatar.type}-${avatar.key}` : 'avatar:not_found';
    }

    function loadAvatarByVoiceState(id: string, voiceState: VoiceStateItem): AvatarState {
        const userConfig = $config.users[id];
        if (!userConfig) return {
            type: 'failed',
            reason: { type: 'no_user_found', id },
        };
        let state: AvatarState = avatars[id] ?? { type: 'unloaded' };
        if (state.type === 'loaded') {
            const cacheKey = getAvatarCacheKeyByVoiceState(userConfig, voiceState.user);
            if (state.cacheKey === cacheKey) return state;
            state = { type: 'unloaded' };
        }
        if (state.type === 'unloaded') {
            if (!userConfig.avatar) {
                const { user } = voiceState;
                const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
                createDefaultAvatar(avatarUrl).then((avatar) => {
                    avatars[id] = {
                        type: 'loaded',
                        context: avatar.create(),
                        prevPos: userConfig.position,
                        cacheKey: getAvatarCacheKeyByVoiceState(userConfig, voiceState.user),
                        getConfig: () => undefined,
                    };
                });
                return avatars[id] = {
                    type: 'loading',
                };
            }
            const model = loadAvatarModelById(userConfig.avatar);
            if (model.type === 'loaded') {
                return avatars[id] = {
                    type: 'loaded',
                    context: model.avatar.create(),
                    cacheKey: model.cacheKey,
                    prevPos: userConfig.position,
                    getConfig: model.getConfig,
                };
            }
        }
        return state;
    }

    const AVATAR_FACE_RADIUS = 200;
    const POSITION_OFFSET = AVATAR_FACE_RADIUS / 2;

    function applyAvatarScale(scale: number) {
        matrices.model.translate(0, AVATAR_FACE_RADIUS, 0);
        matrices.model.scale(scale, scale, 0);
        matrices.model.translate(0, -AVATAR_FACE_RADIUS, 0);
    }

    function applyAvatarTransform(config: AvatarConfig) {
        matrices.model.scale(config.scale, config.scale, 0);
        matrices.model.translate(config.offset[0], config.offset[1], 0);
        if (config.type === 'pngtuber') {
            matrices.model.scale(
                config.flipHorizontal ? -1 : 1,
                config.flipVertical ? -1 : 1,
                1,
            );
        }
    }

    const avatarPositions: Record<string, Vec2> = {};
    function applyUserTransform(id: string, user: UserConfig) {
        const last = Vec2.from(avatarPositions[id] ?? user.position);
        const pos = user.position;
        const deltaTime = timer.getElapsedMS() / 1000;
        const newPos = last.lerp(pos, 1 - Math.exp(-deltaTime * 16));
        matrices.model.translate(newPos.x, newPos.y, 0);
        avatarPositions[id] = newPos;
    }

    async function drawAvatars() {
        const effects: Effect[] = [
            $config.effects.speech.active && speechEffect,
            $config.effects.shadow.active && shadowEffect,
            $config.effects.backlightEffect.active && backlightEffect,
            $config.effects.backlightEffect.active && bloomEffect,
        ].filter((it): it is Effect => !!it);
        const renderOptions: RenderOptions = {
            effects,
        };

        const entries = Object.entries($voiceState).toSorted(comparator(([id]) => {
            const user = $config.users[id];
            return user.lastDraggedAt;
        }));
        for (const [id, voiceState] of entries) {
            const user = $config.users[id];
            if (!voiceState) continue;
            const speakState = $speakingState[id] ?? {
                speaking: false,
                speaking_start: 0,
                speaking_stop: 0,
            };
            const avatar = loadAvatarByVoiceState(id, voiceState);
            if (avatar.type === 'loaded') {
                matrices.model.push();
                applyUserTransform(id, user);
                const config = avatar.getConfig();
                matrices.model.translate(0, -POSITION_OFFSET, 0);
                applyAvatarScale(user.scale);
                if (config) {
                    applyAvatarTransform(config);
                }
                const bounds = avatar.context.bounds();
                const avatarMatrix = matrices.model.get();
                avatar.context.render(matrices, {
                    id,
                    talking: speakState.speaking,
                    mute: voiceState.voice_state.mute,
                    deaf: voiceState.voice_state.deaf,
                    self_mute: voiceState.voice_state.self_mute,
                    self_deaf: voiceState.voice_state.self_deaf,
                    suppress: voiceState.voice_state.suppress,
                    config: user.config,
                }, renderOptions);
                matrices.model.pop();
                const { min, max } = matrices.model.get()
                    .inverse()
                    .transformAABB2(avatarMatrix.transformAABB2(bounds))
                    .expand({ x: 40, y: 40 });
                if ($dragState?.type === 'user' && $dragState.id === id) {
                    draw.roundedRect(min, max, 40, PALETTE_RGB.BACKGROUND_3, 1);
                    draw.roundedRect(min, max, 40, PALETTE_RGB.ACCENT, 5);
                }
                if (!$config.show_name_tags) continue;
                draw.fontSize = overlayApp.isOnAsset() ? 36 : 26;
                const offsetScale = overlayApp.isOnAsset() ? 4 : 2;
                draw.fontWeight = '600';
                for (let index = 0; index < 8; index++) {
                    const offset = {
                        x: Math.cos(index / 8 * TAU) * offsetScale,
                        y: Math.sin(index / 8 * TAU) * offsetScale,
                    };
                    await draw.textAlign(
                        Vec2.from(user.position).add({ x: 0, y: POSITION_OFFSET }).add(offset),
                        voiceState.user.global_name ?? voiceState.user.username,
                        { x: 0.5, y: 1 },
                        { x: 0, y: 0, z: 0, w: 1 },
                    );
                }
                await draw.textAlign(
                    Vec2.from(user.position).add({ x: 0, y: POSITION_OFFSET }),
                    voiceState.user.global_name ?? voiceState.user.username,
                    { x: 0.5, y: 1 },
                    { x: 1, y: 1, z: 1, w: 1 },
                );
            }
        }
    }

    async function drawScreen() {
        if (!$selectedAvatar) return;
        const config = $config.avatars[$selectedAvatar];
        if (!config) return;
        const avatarStatus = loadAvatarModelById($selectedAvatar);
        if (avatarStatus.type == 'loaded') {
            matrices.view.push();
            const { gl } = context;
            const { width, height } = gl.canvas;
            matrices.view.identity();
            draw.rectangle(0, 0, width, height, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);
            matrices.view.translate(width / 2, height / 2 + 60, 0);
            const scaleFactor = 1 / Math.min(1920 / width, 1080 / height) * 0.5;
            $scaleFactor = 1 / scaleFactor / config.scale;
            matrices.view.scale(scaleFactor, scaleFactor, 0);
            matrices.model.push();
            applyAvatarTransform(config);
            const avatarContext = avatarStatus.avatar.create();
            avatarContext.render(matrices, {
                id: $selectedAvatar,
                talking: false,
                mute: false,
                deaf: false,
                self_mute: false,
                self_deaf: false,
                suppress: false,
                config: {
                    pngtuber: {
                        layer: 0,
                    },
                },
            }, {
                effects: [],
            });
            matrices.model.pop();
            for (const { line, color } of [{ line: 3, color: PALETTE_RGB.BACKGROUND_2_TRANSPARENT }, { line: 2, color: PALETTE_RGB.ACCENT }]) {
                draw.circle(0, 0, AVATAR_FACE_RADIUS - line * 2, AVATAR_FACE_RADIUS + line * 2, color);
                draw.rectangle(-AVATAR_FACE_RADIUS - 150, -line, -AVATAR_FACE_RADIUS - 50, line, PALETTE_RGB.ACCENT);
                const triangleSize = 20;
                draw.triangle(
                    { x: -AVATAR_FACE_RADIUS - 150, y: -triangleSize - line },
                    { x: -AVATAR_FACE_RADIUS - 150 - triangleSize, y: 0 },
                    { x: -AVATAR_FACE_RADIUS - 150, y: triangleSize + line },
                    color,
                );
            }
            matrices.view.pop();
        }
    }
</script>

<div class="canvas">
    <Canvas {init} {render} {resize} />
</div>

<style lang="scss">
    .canvas {
        position: absolute;
        inset: 0;
    }
</style>
