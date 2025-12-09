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
    import { AvatarManager } from '../avatars/avatar-manager.js';
    import type { RenderOptions } from '../avatars/avatar.js';
    import { PALETTE_RGB } from '../consts.js';
    import { DiscordOverlayApp, type AlignSide, type AvatarConfig, type UserConfig } from '../discord-overlay-app.js';
    import type { RPCSpeakingStates, RPCVoiceStates } from '../discord/discord.js';
    import type { VoiceStateItem } from '../discord/type.js';
    import { EffectManager } from '../effects/effect-manager.js';
    import { alignClear, alignIndexes, alignSide, avatarPositions, dragPosition, dragState, scaleFactor, selectedAvatar, view } from '../states.js';
    import { LayoutEngine } from './layout-engine.svelte.js';

    interface Props {
        overlayApp: DiscordOverlayApp;
        voiceState: RPCVoiceStates;
        speakingState: RPCSpeakingStates;
        dimensions?: Vec2;
    }

    let {
        overlayApp,
        voiceState,
        speakingState,
        dimensions = new Vec2(1920, 1080),
    }: Props = $props();
    const { config } = overlayApp;

    let context: GlContext;
    let matrices = new Matrices();
    let draw: Draw;
    let frameTimer = new Timer();

    async function resize() {
        $view = matrices.get();
    }

    let effectManager: EffectManager;
    let avatarManager: AvatarManager;
    let layoutEngine: LayoutEngine;

    async function init(ctx: GlContext) {
        context = ctx;
        matrices = new Matrices();
        draw = new Draw(matrices, ctx);
        effectManager = await EffectManager.new(ctx, () => $config);
        avatarManager = new AvatarManager(ctx, overlayApp, () => $config);
        layoutEngine = new LayoutEngine($config, dimensions);
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
        const inner = screen.sub(start).sub(end);
        const scaleVector = inner.div(dimensions);
        const scaleFactor = Math.min(scaleVector.x, scaleVector.y);
        matrices.view.translate(start.x, start.y, 0);
        const space = inner.sub(dimensions.scale(scaleFactor)).scale(0.5);
        matrices.view.translate(space.x, space.y, 0);
        matrices.view.scale(scaleFactor, scaleFactor, scaleFactor);
        $view = matrices.get();
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

        if (overlayApp.isOnClient()) {
            drawBackground();
        }
        await drawAvatars();
        await drawHeldTips();
        await drawScreen();

        frameTimer.reset();
    }

    const AVATAR_FACE_RADIUS = 150;
    const POSITION_OFFSET = AVATAR_FACE_RADIUS / 2;

    function drawBackground() {
        draw.rectangle(0, 0, dimensions.x, dimensions.y, new Vec4(1, 1, 1, 1));
    }

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

    function applyUserTransform(id: string, user: UserConfig, alignSide: AlignSide | undefined, index: number, total: number): { target: Vec2Like; current: Vec2Like } {
        const last = avatarPositions[id];
        const transform = { ...last ?? {
            targetPos: user.position,
            pos: user.position,
            rot: 0,
            scale: Vec2.ONE,
        } };
        const deltaTime = frameTimer.getElapsedMS() / 1000;
        const t = 1 - Math.exp(-deltaTime * 16);
        if (alignSide && user.align) {
            const { align, side } = alignSide;
            transform.pos = layoutEngine.calculateAlignPosition(alignSide, index, total);
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
                user.position = transform.pos;
                transform.targetPos = user.position;
            }
        } else {
            if (alignSide) {
                const dir = layoutEngine.calculateAlignDir(alignSide);
                const newDistances = {
                    ...alignDistanceCache,
                    [id]: dir.dot(id === $dragState?.id ? $dragPosition ?? user.position : user.position),
                };
                const alignIndexes = Object.fromEntries(
                    Object.entries(newDistances)
                        .sort(comparator(([, offset]) => offset))
                        .map(([id], index) => [id, index]),
                );
                transform.targetPos = layoutEngine.calculateAlignPosition(alignSide, alignIndexes[id], total);
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
        return { effects: effectManager.getActiveEffects() };
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
        const dir = layoutEngine.calculateAlignDir($config.align.alignSide!);
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
            const avatar = avatarManager.loadAvatarByVoiceState(id, voiceState);
            if (avatar.type !== 'loaded') return;
            matrices.model.push();

            const { target, current } = applyUserTransform(id, user, $config.align.alignSide, $alignIndexes[id], alignTotal);
            const screenPos = matrices.model.get().transform2({ x: 0, y: POSITION_OFFSET });
            matrices.model.translate(0, -POSITION_OFFSET, 0);

            const avatarConfig = avatar.data.getConfig();
            const spacingFactor = layoutEngine.getFitScaleFactor();
            applyAvatarScale(user.scale / spacingFactor);
            if (avatarConfig) {
                applyAvatarTransform(avatarConfig);
            }

            const bounds = avatar.data.context.bounds();
            const avatarMatrix = matrices.model.get();
            const worldBounds = avatarMatrix.transformAABB2(bounds).expand({ x: 40, y: 40 });
            const alignedWorldBounds = worldBounds
                .offset(Vec2.from(current).scale(-1))
                .offset(target);

            if (!screenBounds.intersects(worldBounds)) {
                matrices.model.pop();
                continue;
            }

            avatar.data.context.render(matrices, {
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
                { width: offsetScale, color: new Vec4(0, 0, 0, 1) },
            );
        }
    }

    let hoveredAlign: string | undefined = undefined;

    const RADIUS = 24;
    const RADIUS_VEC = new Vec2(RADIUS, RADIUS);

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
            return align.dir.scale(MARGIN * dragT).add(dir01.mul(dimensions));
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
            const dirPerp = layoutEngine.getAlignPerpendicularOffset(align.dir)
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
            const center = worldView.transform2(dimensions.scale(0.5));
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
        const avatarConfig = $config.avatars[$selectedAvatar];
        if (!avatarConfig) return;
        const avatarStatus = avatarManager.loadAvatarModelById($selectedAvatar);
        if (avatarStatus.type == 'loaded') {
            matrices.view.push();
            const { gl } = context;
            const { width, height } = gl.canvas;
            matrices.view.identity();
            draw.rectangle(0, 0, width, height, PALETTE_RGB.BACKGROUND_1_TRANSPARENT);
            matrices.view.translate(width / 2, height / 2 + 60, 0);
            const scale = 1 / Math.min(1920 / width, 1080 / height);
            $scaleFactor = 1 / scale / avatarConfig.scale;
            matrices.view.scale(scale, scale, 0);
            matrices.model.push();
            applyAvatarTransform(avatarConfig);
            const avatarContext = avatarStatus.data.avatar.create();
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
