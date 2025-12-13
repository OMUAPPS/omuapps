<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
    import { Tooltip } from '@omujs/ui';
    import type { DiscordOverlayApp, UserConfig } from '../discord-overlay-app.js';
    import type { RPCVoiceStates } from '../discord/discord.js';
    import type { VoiceStateItem } from '../discord/type.js';
    import { alignClear, alignSide, avatarPositions, dragPosition, dragState, heldUser, isDraggingFinished, view } from '../states.js';
    import UserSettings from './UserSettings.svelte';

    interface Props {
        resolution: Vec2Like;
        overlayApp: DiscordOverlayApp;
        voiceStates: RPCVoiceStates;
        id: string;
        voiceState: VoiceStateItem;
        user: UserConfig;
        dimensions?: Vec2Like;
    }

    let {
        resolution,
        overlayApp,
        voiceStates,
        id,
        voiceState,
        user = $bindable(),
        dimensions = { x: 1920, y: 1080 },
    }: Props = $props();

    const { config } = overlayApp;
    const OFFSET = 150;

    let element: HTMLElement | null = $state(null);
    let rect = $state({ width: 0, height: 0 });

    let position = $state(user.position);
    let isDragging = $state(false);
    let lastMouse: [number, number] | null = null; // No need for signal if not used in template
    let clickStart = { time: 0, dist: 0 };
    let lastUpdate = 0;

    $effect(() => {
        const newPosition = Vec2.from(user.position);
        if (Number.isNaN(newPosition.x)) return;
        if (newPosition.distance(position) === 0) return;
        if (!isDragging) position = newPosition;
    });

    $effect(() => {
        if (element) rect = element.getBoundingClientRect();
    });

    let style = $derived.by(() => {
        const screen = worldToScreen({ x: position.x, y: position.y + OFFSET });
        const clamped = screen
            .add({ x: -rect.width / 2, y: -rect.height })
            .max({ x: 8, y: 8 })
            .min({ x: resolution.x - rect.width - 8, y: resolution.y - rect.height - 8 });

        return `left: ${clamped.x}px; bottom: ${clamped.y}px;`;
    });

    function worldToScreen(pos: { x: number; y: number }) {
        const screen = $view.transform2(pos);
        return screen.scale(0.5).add({ x: 0.5, y: 0.5 }).mul(resolution);
    }

    function screenToWorld(x: number, y: number) {
        const zeroToOne = new Vec2(x, y).mul({ x: 1 / resolution.x, y: 1 / resolution.y });
        const screen = zeroToOne.sub({ x: 0.5, y: 0.5 }).scale(2);
        return $view.inverse().transform2(screen);
    }

    function calculateAlignment(currentPos: Vec2) {
        if (!$config.align.alignSide) return false;

        const align = Vec2.from($config.align.alignSide.align);
        const alignOrigin = Vec2.from(align).add(Vec2.ONE).mul({ x: dimensions.x / 2, y: dimensions.y / 2 });
        const dragPosWorld = $dragPosition!;
        const currentProj = align.dot(currentPos);
        const projections = Object.values(avatarPositions).map((p) => align.dot(p.pos));
        const min = Math.min(...projections);
        const max = Math.max(...projections);
        const onCorner = currentProj < min || currentProj > max;

        const offset = alignOrigin.sub(dragPosWorld);
        const dist = Math.max(
            offset.dot(align) * 2,
            new AABB2(Vec2.ZERO, new Vec2(dimensions.x, dimensions.y)).distance(dragPosWorld),
            onCorner && avatarPositions[id] ? Vec2.from(avatarPositions[id].targetPos).sub(currentPos).mul({ x: align.y, y: align.x }).length() : 0,
        );

        return dist > -150 && dist < 300;
    }

    function countAlignedUsers() {
        return Object.entries(voiceStates.states).filter(([uid]) => uid !== id && $config.users[uid]?.align).length;
    }

    function handleStart(x: number, y: number) {
        const screen = worldToScreen(position);
        const safeScreen = screen.add({ x: 0, y: -OFFSET / 2 }).max(Vec2.ZERO).min(resolution).add({ x: 0, y: OFFSET / 2 });

        position = screenToWorld(safeScreen.x, safeScreen.y);
        lastMouse = [x, y];
        clickStart = { time: performance.now(), dist: 0 };
        user.lastDraggedAt = Date.now();
        isDragging = true;
    }

    function handleMove(x: number, y: number) {
        if (!lastMouse) return;

        const now = performance.now();
        if (now - lastUpdate < 16) return;
        lastUpdate = now;

        const dx = x - lastMouse[0];
        const dy = y - lastMouse[1];
        lastMouse = [x, y];

        const screen = worldToScreen(position);
        const world = screenToWorld(screen.x + dx, screen.y - dy);
        position = world;
        user.position = position;

        clickStart.dist += Math.sqrt(dx ** 2 + dy ** 2);
        $dragPosition = screenToWorld(x, resolution.y - y);
        $dragState = { type: 'user', id, time: clickStart.time, x, y };

        if (countAlignedUsers() === 0) $config.align.alignSide = undefined;
        user.align = calculateAlignment(Vec2.from(position));
    }

    function handleEnd() {
        lastMouse = null;
        isDragging = false;
        $dragState = null;
        $isDraggingFinished = true;

        if ($alignClear) {
            $config.align.alignSide = undefined;
            user.align = false;
            for (const user of Object.values($config.users)) {
                if (user.align) {
                    position.y -= 40;
                    user.align = false;
                }
            }

            return;
        }

        if (countAlignedUsers() === 0) $config.align.alignSide = undefined;

        if ($alignSide) {
            $config.align.alignSide = $alignSide;
            $alignSide = undefined;
            user.align = true;
            for (const u of Object.values($config.users)) {
                if (u.position.x > -150 && u.position.x < dimensions.x + 150 &&
                    u.position.y > -150 && u.position.y < dimensions.y + 150) {
                    u.align = true;
                }
            }
        }
    }

    function handleClick() {
        const elapsed = performance.now() - clickStart.time;
        if (elapsed <= 200 && clickStart.dist <= 2) {
            $heldUser = id;
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'r') {
            user.position = new Vec2(resolution.x / 2, resolution.y / 2);

            return;
        }

        const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        if (arrows[e.key]) {
            e.preventDefault();
            const factor = e.ctrlKey ? 1 : e.shiftKey ? 100 : 10;
            user.position = Vec2.from(user.position).add({ x: arrows[e.key][0] * factor, y: arrows[e.key][1] * factor });
        }
    }

    function handleWheel(e: WheelEvent) {
        const currentLevel = Math.log2(user.scale);
        user.scale = BetterMath.clamp(Math.pow(2, currentLevel - e.deltaY / 1000), 0.1, 5);
    }
</script>

<svelte:window
    onmousemove={(e) => handleMove(e.clientX, e.clientY)}
    onmouseup={handleEnd}
    ontouchmove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
    ontouchend={handleEnd}
/>

<button
    class="control"
    class:dragging={isDragging || ($dragState?.type === 'user' && $dragState.id == id)}
    bind:this={element}
    style={style}
    onmousedown={(e) => handleStart(e.clientX, e.clientY)}
    ontouchstart={(e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onwheel={handleWheel}
    draggable="false"
    style:opacity={$dragState?.type === 'user' && $dragState.id != id ? 0.2 : 1}
>
    {#if !isDragging}
        <Tooltip>
            <p class="action-hint"><i class="ti ti-pointer"></i><small>クリックで</small><b>設定 <i class="ti ti-settings"></i></b></p>
            <p class="action-hint"><i class="ti ti-hand-stop"></i><small>つかんで</small><b>移動 <i class="ti ti-drag-drop"></i></b></p>
            <p class="action-hint"><i class="ti ti-mouse"></i><small>スクロールで</small><b>拡大縮小 <i class="ti ti-zoom-in"></i></b></p>
        </Tooltip>
    {/if}
    <i class="grip ti ti-grip-vertical"></i>
    <span class="nick">{voiceState.nick}</span>
</button>

{#if $heldUser == id}
    <div
        class="settings"
        style={style}
        style:opacity={$heldUser && $heldUser != id ? 0.2 : 1}
        class:side-right={user.position.x > 1920 / 2}
    >
        <UserSettings {overlayApp} {voiceState} {id} />
    </div>
{/if}

<style lang="scss">
	.settings {
		position: absolute;
		background: var(--color-bg-2);
		filter: drop-shadow(3px 5px 0 rgba(0, 0, 0, 0.0621)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.0621));
		outline: 1px solid var(--color-outline);
		border-radius: 0.25rem;
		z-index: 2;
		padding: 2rem 3.5rem;

		&.side-right {
			animation: slide-in-right 0.0621s forwards;
			&::before {
				content: ''; position: absolute; right: -0.5rem; top: 50%; transform: translate(50%, -50%);
				border: 0.5rem solid transparent; border-left-color: var(--color-outline);
			}
			&::after {
				content: ''; position: absolute; right: -0.49rem; top: 50%; transform: translate(50%, -50%);
				border: 0.5rem solid transparent; border-left-color: var(--color-bg-2);
			}
		}

		&:not(.side-right) {
			animation: slide-in-left 0.0621s forwards;
			&::before {
				content: ''; position: absolute; left: -0.49rem; top: 50%; transform: translate(-50%, -50%);
				border: 0.5rem solid transparent; border-right-color: var(--color-bg-2);
			}
		}
	}

	@keyframes slide-in-right {
		0% { opacity: 0; transform: translate(-100%, 0) translate(-5rem, 0); }
		97.9% { transform: translate(-100%, 0) translate(-6.1rem, 0); }
		100% { transform: translate(-100%, 0) translate(-6rem, 0); }
	}

	@keyframes slide-in-left {
		0% { opacity: 0; transform: translate(50%, 0) translate(3rem, 0); }
		97.9% { transform: translate(50%, 0) translate(4.1rem, 0); }
		100% { transform: translate(50%, 0) translate(4rem, 0); }
	}

	.control {
		position: absolute;
		background: var(--color-bg-2);
		color: var(--color-1);
		border: 1px solid var(--color-1);
		outline: 0.25rem solid color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 1rem 0;
		height: 2rem;
		border-radius: 999rem;
		display: flex;
		align-items: center;
		white-space: nowrap;
		cursor: grab;
		z-index: 2;

		> .grip {
			border-radius: 100%; height: 2rem; width: 2rem;
			display: flex; align-items: center; justify-content: center;
		}

		> .nick {
			overflow: hidden; max-width: 5rem; text-overflow: ellipsis; padding-right: 1rem;
		}

		&.dragging, &:focus-visible, &:hover {
			background: var(--color-bg-2); color: var(--color-1);
			outline: 2px solid var(--color-1); border: 1px solid var(--color-1);
			box-shadow: 0 0.3rem 0 0 color-mix(in srgb, var(--color-2) 100%, transparent 0%);
			margin-left: 1px; transition: margin-bottom, outline-width, box-shadow 0.0621s;
			z-index: 3;
		}

		&:active {
			z-index: 3; cursor: grabbing; box-shadow: none;
			margin-bottom: -2px; margin-left: 1px;
			background: var(--color-1); color: var(--color-bg-2);
			transition: margin-bottom, box-shadow, background 0.0621s;
		}
	}

	.action-hint {
		display: flex; align-items: center; gap: 0.25rem; margin: 0.5rem 0;
		> b { margin-left: auto; padding-left: 2rem; > i { margin-left: 0.25rem; } }
		i { font-size: 1rem; }
	}
</style>
