<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import { type GlContext } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { comparator } from '$lib/helper.js';
    import { BetterMath } from '$lib/math.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Axis } from '$lib/math/axis.js';
    import { TAU } from '$lib/math/math.js';
    import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { Timer } from '$lib/timer.js';
    import { PALETTE_RGB } from '../consts.js';
    import { DiscordOverlayApp, type AlignSide, type AvatarConfig, type UserConfig } from '../discord-overlay-app.js';
    import type { RPCSpeakingStates, RPCVoiceStates } from '../discord/discord.js';
    import type { User, VoiceStateItem } from '../discord/type.js';
    import { createBackLightEffect } from '../effects/backlight.js';
    import { createBloomEffect } from '../effects/bloom.js';
    import { createShadowEffect } from '../effects/shadow.js';
    import { createSpeechEffect } from '../effects/speech.js';
    import type { Avatar, AvatarContext, Effect, RenderOptions } from '../pngtuber/avatar.js';
    import { PNGAvatar } from '../pngtuber/pngavatar.js';
    import { PNGTuber, type PNGTuberData } from '../pngtuber/pngtuber.js';
    import { alignClear, alignIndexes, alignSide, avatarPositions, dragPosition, dragState, scaleFactor, selectedAvatar, view } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    export let voiceState: RPCVoiceStates;
    export let speakingState: RPCSpeakingStates;
    export let dimensions = {
        width: 1920,
        height: 1080,
    };
    const { config } = overlayApp;

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

    function setupWorldMatrices() {
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

        setupWorldMatrices();
        $view = matrices.get();

        if (overlayApp.isOnClient()) {
            draw.rectangle(0, 0, dimensions.width, dimensions.height, new Vec4(1, 1, 1, 1));
        }
        await drawAvatars();
        await drawHeldTips();
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

    function getAvatarCacheKeyByVoiceState(config: UserConfig, user: User): AvatarCacheKey {
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

    const AVATAR_FACE_RADIUS = 150;
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

    function calculateAlignDir(alignSide: AlignSide): Vec2 {
        const { align, side } = alignSide;
        const horizontal = align.y === 0;
        return new Vec2(
            horizontal ? 0 : (side === 'start' ? 1 : -1),
            horizontal ? (side === 'end' ? -1 : 1) : 0,
        );
    }

    const AVATAR_DEFAULT_SPACING = 300;

    function getFitScaleFactor(): number {
        const MARGIN = $config.align.margin;
        const total = Object.keys(alignDistanceCache).length;
        const spacing = AVATAR_DEFAULT_SPACING / Math.min(AVATAR_DEFAULT_SPACING, (dimensions.width - MARGIN * 2) / total);
        return spacing;
    }

    function calculateAlignPosition(alignSide: AlignSide, index: number, total: number): Vec2 {
        const MARGIN = $config.align.margin;
        const { align, side } = alignSide;
        const align01 = Vec2.from(align).add(Vec2.ONE).mul({ x: dimensions.width / 2 - MARGIN, y: dimensions.height / 2 - MARGIN }).add({ x: MARGIN, y: MARGIN });
        const dirPerp = getAlignPerpendicularOffset(align);
        const sideScalar = { start: -1, middle: 0, end: 1 }[side];
        const origin = align01.add(dirPerp.scale(Math.abs(align.x) > Math.abs(align.y) ? dimensions.height / 2 : dimensions.width / 2).scale(sideScalar));

        const spacing = Math.min(AVATAR_DEFAULT_SPACING, (dimensions.width - MARGIN * 2) / total);
        let offsetScale = index * spacing + MARGIN * 2;
        if (side === 'middle') {
            offsetScale = (index - (total - 1) / 2) * spacing;
        } else {
            offsetScale = offsetScale;
        }
        const offsetDir = calculateAlignDir(alignSide);
        const offset = offsetDir.scale(offsetScale);
        return origin.add(offset);
    }

    function applyUserTransform(id: string, user: UserConfig, alignSide: AlignSide | undefined, index: number, total: number): { target: Vec2Like; current: Vec2Like } {
        const last = avatarPositions[id];
        const transform = { ...last ?? {
            targetPos: user.position,
            pos: user.position,
            rot: 0,
            scale: Vec2.ONE,
        } };
        const deltaTime = timer.getElapsedMS() / 1000;
        const t = 1 - Math.exp(-deltaTime * 16);
        if (alignSide && user.align) {
            const { align, side } = alignSide;
            transform.pos = calculateAlignPosition(alignSide, index, total);
            transform.targetPos = transform.pos;

            const horizontal = align.y === 0;

            let flipX = horizontal ? align.x > 0 : side === 'start';
            let flipY = horizontal ? true : align.y < 0;
            transform.scale = new Vec2(
                flipX ? -1 : 1,
                flipY ? -1 : 1,
            );
            transform.rot = horizontal ? TAU / 4 : 0;
            if (id !== $dragState?.id) {
                user.position = Vec2.from(user.position).lerp(transform.pos, t);
                transform.targetPos = user.position;
            }
        } else {
            if (alignSide) {
                const dir = calculateAlignDir(alignSide);
                const newDistances = {
                    ...alignDistanceCache,
                    [id]: dir.dot(id === $dragState?.id ? $dragPosition ?? user.position : user.position),
                };
                const alignIndexes = Object.fromEntries(
                    Object.entries(newDistances)
                        .sort(comparator(([, offset]) => offset))
                        .map(([id], index) => [id, index]),
                );
                transform.targetPos = calculateAlignPosition(alignSide, alignIndexes[id], total);
            }
            transform.pos = user.position;
            transform.scale = Vec2.ONE;
            transform.rot = 0;
        }

        const newTransform = {
            targetPos: transform.targetPos,
            pos: Vec2.from(last?.pos ?? transform.pos).lerp(transform.pos, t),
            rot: BetterMath.lerpAngle(last?.rot ?? 0, transform.rot, t),
            scale: Vec2.from(last?.scale ?? Vec2.ONE).lerp(transform.scale, t),
        };
        avatarPositions[id] = newTransform;
        matrices.model.translate(newTransform.pos.x, newTransform.pos.y, 0);
        matrices.model.scale(newTransform.scale.x, newTransform.scale.y, 0);
        matrices.model.rotate(Axis.Z_POS.rotate(newTransform.rot));
        return {
            target: user.align ? newTransform.targetPos : newTransform.pos,
            current: newTransform.pos,
        };
    }

    let alignDistanceCache: Record<string, number> = {};

    function getRenderOptions(): RenderOptions {
        const effects: Effect[] = [
            $config.effects.speech.active && speechEffect,
            $config.effects.shadow.active && shadowEffect,
            $config.effects.backlightEffect.active && backlightEffect,
            $config.effects.backlightEffect.active && bloomEffect,
        ].filter((it): it is Effect => !!it);

        return { effects };
    }

    function getSortedVoiceEntries(): [string, VoiceStateItem][] {
        return Object.entries(voiceState.states)
            .filter((entry): entry is [string, VoiceStateItem] => !!entry[1])
            .filter(([id]) => $config.users[id])
            .toSorted(comparator(([id]) => $config.users[id].lastDraggedAt));
    }

    function calculateAlignments(entries: [string, VoiceStateItem][]): number {
        let alignTotal = 0;
        alignDistanceCache = {};
        const draggingUser = $dragState?.id && $config.users[$dragState.id];
        const includeDragging = draggingUser && draggingUser.align;
        for (const [id, voiceState] of entries) {
            if (!voiceState) continue;
            const user = $config.users[id];
            const isDraggingUser = $dragState?.id === id;
            if (!user.align && (!includeDragging || !isDraggingUser)) continue;

            alignTotal++;
            alignDistanceCache[id] = $config.align.alignSide
                ? calculateAlignOffset(id, user)
                : 0;
        }
        return alignTotal;
    }

    function calculateAlignOffset(id: string, user: UserConfig): number {
        const dir = calculateAlignDir($config.align.alignSide!);
        const position = id === $dragState?.id ? $dragPosition ?? user.position : user.position;
        return dir.dot(position);
    }

    function getWorldSpaceScreenBounds() {
        const { gl } = context;
        const { width, height } = gl.canvas;
        return matrices.view.get().inverse().transformAABB2(new AABB2(Vec2.ZERO, new Vec2(width, height)));
    }

    function getAlignIndexes(): Record<string, number> {
        return Object.fromEntries(
            Object.entries(alignDistanceCache)
                .sort(comparator(([, offset]) => offset))
                .map(([id], index) => [id, index]),
        );
    }

    async function drawAvatars() {
        const renderOptions = getRenderOptions();

        const entries = getSortedVoiceEntries();
        let alignTotal = calculateAlignments(entries);
        $alignIndexes = getAlignIndexes();
        const names: Array<{
            user: UserConfig;
            pos: Vec2;
            name: string;
        }> = [];
        const screenBounds = getWorldSpaceScreenBounds();
        const align = $config.align.alignSide && alignTotal > 0;
        for (const [id, voiceState] of entries) {
            const user = $config.users[id];
            if (!voiceState) continue;
            const speakState = speakingState.states[id] ?? {
                speaking: false,
                speaking_start: 0,
                speaking_stop: 0,
            };
            const avatar = loadAvatarByVoiceState(id, voiceState);
            if (avatar.type !== 'loaded') return;
            matrices.model.push();

            const { target, current } = applyUserTransform(id, user, $config.align.alignSide, $alignIndexes[id], alignTotal);
            const screenPos = matrices.model.get().transform2({ x: 0, y: POSITION_OFFSET });
            matrices.model.translate(0, -POSITION_OFFSET, 0);

            const config = avatar.getConfig();
            const spacingFactor = getFitScaleFactor();
            applyAvatarScale(user.scale / spacingFactor);
            if (config) {
                applyAvatarTransform(config);
            }

            const bounds = avatar.context.bounds();
            const avatarMatrix = matrices.model.get();
            const worldBounds = avatarMatrix.transformAABB2(bounds).expand({ x: 40, y: 40 });
            const alignedWorldBounds = worldBounds
                .offset(Vec2.from(current).scale(-1))
                .offset(target);

            if (!screenBounds.intersects(worldBounds)) {
                matrices.model.pop();
                continue;
            }

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
            if (align && user.align && $dragState?.id === id) {
                const { min, max } = alignedWorldBounds;
                const center = alignedWorldBounds.center();
                draw.roundedRect(min, max, 40, PALETTE_RGB.BACKGROUND_3, 1);
                draw.roundedRect(min, max, 40, PALETTE_RGB.ACCENT, 5);
                draw.fontSize = 24;
                draw.fontWeight = '600';
                await draw.textAlign(
                    { x: center.x, y: max.y + 20 },
                    'ここに整列',
                    Vec2.ONE.scale(0.5),
                    PALETTE_RGB.ACCENT,
                    { color: PALETTE_RGB.BACKGROUND_3, width: 3 },
                );
            } else if ($dragState?.id === id) {
                const { min, max } = worldBounds;
                draw.roundedRect(min, max, 40, PALETTE_RGB.OUTLINE_1, 5);
            }
            if (!$config.show_name_tags) continue;
            const name = voiceState.nick ?? voiceState.user.global_name ?? voiceState.user.username;
            names.push({
                user,
                pos: screenPos,
                name,
            });
        }
        const offsetScale = overlayApp.isOnAsset() ? 4 : 2;
        const alignSide = $config.align.alignSide;
        const horizontal = alignSide && alignSide.align.y === 0;
        draw.fontSize = overlayApp.isOnAsset() ? 36 : 26;
        draw.fontWeight = '600';
        for (const entry of names) {
            const { pos, name, user } = entry;
            const align = user.align ? alignSide?.align : undefined;
            await draw.textAlign(
                horizontal ? pos.add({ x: 0, y: align ? POSITION_OFFSET * 2 : 0 }) : pos,
                name,
                { x: align ? (align.x + 1) / 2 : 0.5, y: 1 },
                { x: 1, y: 1, z: 1, w: 1 },
                {
                    width: offsetScale,
                    color: new Vec4(0, 0, 0, 1),
                },
            );
        }
    }

    let hoveredAlign: string | undefined = undefined;

    const RADIUS = 24;
    const RADIUS_VEC = new Vec2(RADIUS, RADIUS);
    const getAlignPerpendicularOffset = (align: Vec2Like): Vec2 => {
        return Vec2.from(align).turnRight().scale(align.x > 0 || align.y < 0 ? -1 : 1);
    };

    function alignedCount(): number {
        return Object.entries(voiceState.states).filter(([userId]) => {
            const user = $config.users[userId];
            return user?.align;
        }).length;
    }

    async function drawHeldTips() {
        if (!$dragState) return;
        $alignSide = undefined;
        const dragTime = performance.now() - $dragState.time;
        const dragT = (1 - 1 / (dragTime + 1));
        const screen = new Vec2(dimensions.width, dimensions.height);
        matrices.push();
        setupWorldMatrices();
        const worldView = matrices.view.get();
        const worldViewInv = worldView.inverse();
        matrices.view.identity();

        type Align = {
            dir: Vec2;
            name: string;
            icon: string;
            iconStart: string;
            iconEnd: string;
        };

        type Side = 'start' | 'middle' | 'end';
        type ClosestInfo = {
            align: Align;
            side: Side;
            icon: string;
            dist: number;
            pos: Vec2;
        } | undefined;

        const ALIGNS: Align[] = [
            { dir: Vec2.LEFT, name: '左', icon: '\uec89', iconStart: '\uec8b', iconEnd: '\uec88' },
            { dir: Vec2.RIGHT, name: '右', icon: '\uec8a', iconStart: '\uec8b', iconEnd: '\uec88' },
            { dir: Vec2.DOWN, name: '上', icon: '\uec8b', iconStart: '\uec89', iconEnd: '\uec8a' },
            { dir: Vec2.UP, name: '下', icon: '\uec88', iconStart: '\uec89', iconEnd: '\uec8a' },
        ];

        const MARGIN = 300;
        const OUTLINE = 2;

        const { width, height } = context.gl.canvas;
        const marginMounds = new AABB2(Vec2.ZERO, new Vec2(width, height)).shrink({ x: 40, y: 40 });
        let closest: ClosestInfo = undefined;
        let anyHovered = false;

        // Helper functions
        const getWorldPoint = (align: Align): Vec2 => {
            const dir01 = align.dir.add(Vec2.ONE).scale(0.5);
            return align.dir.scale(MARGIN * dragT).add(dir01.mul(screen));
        };

        const drawAlignIcon = async (point: Vec2, icon: string, color = PALETTE_RGB.ACCENT): Promise<void> => {
            draw.fontFamily = 'tabler-icons';
            draw.fontSize = 16;
            draw.fontWeight = 'normal';
            await draw.textAlign(point, icon, Vec2.ONE.scale(0.4), color);
        };

        const drawTooltip = (pos: Vec2, closest: NonNullable<ClosestInfo>): void => {
            const arrowScale = 5;
            let text = `${closest.align.name}に整列${{ start: '初め', middle: '真ん中', end: '最後' }[closest.side]}`;
            const anchor = pos.add({ x: 0, y: RADIUS * 2 + arrowScale + OUTLINE });
            const bounds = draw.measureTextActual(text)
                .setAt({ x: 0.5, y: 1 }, Vec2.ZERO)
                .offset(anchor)
                .expand({ x: 14, y: 8 });

            const center = bounds.center();
            draw.rectangle(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, PALETTE_RGB.TOOLTIP_BACKGROUND);

            draw.triangle(
                { x: center.x - arrowScale, y: bounds.min.y },
                { x: center.x, y: bounds.min.y - arrowScale },
                { x: center.x + arrowScale, y: bounds.min.y },
                PALETTE_RGB.TOOLTIP_BACKGROUND,
            );

            draw.fontFamily = 'Noto Sans JP';
            draw.fontSize = 16;
            draw.fontWeight = '600';
            draw.textAlign(anchor, text, { x: 0.5, y: 1 }, PALETTE_RGB.TOOLTIP_TEXT);
        };

        // Main loop
        for (const align of ALIGNS) {
            const pointWorld = getWorldPoint(align);
            const point = marginMounds.closest(worldView.transform2(pointWorld));
            const hovered = hoveredAlign === align.icon;
            const scale = hovered ? 2 : 0;
            const dirPerp = getAlignPerpendicularOffset(align.dir)
                .scale(RADIUS)
                .scale(scale);

            const bounds = new AABB2(
                point.sub(RADIUS_VEC).sub(dirPerp),
                point.add(RADIUS_VEC).add(dirPerp),
            );

            const renderBounds = worldViewInv.transformAABB2(bounds);
            const isInBound = $dragPosition && renderBounds.distance($dragPosition) < 1;

            draw.roundedRect(bounds.min, bounds.max, RADIUS, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);
            draw.roundedRect(bounds.min, bounds.max, RADIUS, PALETTE_RGB.ACCENT, OUTLINE);

            if (isInBound) {
                anyHovered = true;
                hoveredAlign = align.icon;

                const sides = [
                    { side: 'start' as Side, pos: point.sub(dirPerp), icon: align.iconStart },
                    { side: 'middle' as Side, pos: point, icon: align.icon },
                    { side: 'end' as Side, pos: point.add(dirPerp), icon: align.iconEnd },
                ];

                draw.fontSize = 16;
                draw.fontFamily = 'Noto Sans JP';

                for (const { side, pos, icon } of sides) {
                    await drawAlignIcon(pos, icon);

                    const posWorld = worldViewInv.transform2(pos);
                    const dist = $dragPosition?.distance(posWorld);

                    if (dist && (!closest || dist < closest.dist)) {
                        closest = { align, side, icon, dist, pos };
                    }
                }
            } else {
                await drawAlignIcon(point, align.icon);
            }
        }

        if (!anyHovered) {
            closest = undefined;
            hoveredAlign = undefined;
        }

        if ($config.align.alignSide && alignedCount() > 2) {
            const center = worldView.transform2(screen.scale(0.5));
            const bounds = draw.measureTextActual('整列を解除').centered(Vec2.ONE.scale(0.5)).offset(center).expand({ x: 150, y: 50 });
            const boundsOutline = bounds.expand(Vec2.ONE.scale(2));
            const worldBounds = worldViewInv.transformAABB2(boundsOutline);
            const hovered = $dragPosition ? worldBounds.contains($dragPosition) : false;
            $alignClear = hovered;
            if (hovered) {
                draw.roundedRect(boundsOutline.min, boundsOutline.max, RADIUS + 2, PALETTE_RGB.ACCENT);
                await draw.textAlign(center, '整列を解除', Vec2.ONE.scale(0.5), PALETTE_RGB.BACKGROUND_1);
            } else {
                draw.roundedRect(boundsOutline.min, boundsOutline.max, RADIUS + 2, PALETTE_RGB.ACCENT, 2);
                await draw.textAlign(center, '整列を解除', Vec2.ONE.scale(0.5), PALETTE_RGB.ACCENT);
            }
        } else {
            $alignClear = false;
        }

        if (closest) {
            const pos = closest.pos.sub(closest.align.dir.scale(RADIUS * 4));
            drawTooltip(pos, closest);
            draw.circle(pos.x, pos.y, 0, RADIUS, PALETTE_RGB.ACCENT);
            await drawAlignIcon(pos, closest.icon, PALETTE_RGB.BACKGROUND_1);
            $alignSide = { align: closest.align.dir, side: closest.side };
        }

        matrices.pop();
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
            const scaleFactor = 1 / Math.min(1920 / width, 1080 / height);
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
