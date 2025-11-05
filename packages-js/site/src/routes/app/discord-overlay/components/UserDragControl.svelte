<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import type { Mat4 } from '$lib/math/mat4.js';
    import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
    import { Tooltip } from '@omujs/ui';
    import { type Config, type DiscordOverlayApp, type UserConfig, type VoiceStateItem } from '../discord-overlay-app.js';
    import { alignSide, dragPosition, dragState, heldUser, isDraggingFinished, view } from '../states.js';
    import UserSettings from './UserSettings.svelte';

    export let dimentions: { width: number; height: number };
    export let overlayApp: DiscordOverlayApp;
    export let id: string;
    export let state: VoiceStateItem;
    export let user: UserConfig;

    const { config } = overlayApp;

    let lastMouse: [number, number] | null = null;
    let clickTime = 0;
    let clickDistance = 0;
    let lastUpdate = performance.now();
    let rect = { width: 0, height: 0 };
    let element: HTMLElement | null = null;

    $: {
        if (element) {
            rect = element.getBoundingClientRect();
        }
    }

    const OFFSET = 150;

    function handleMouseMove(x: number, y: number) {
        if (!lastMouse) return;
        const now = performance.now();
        if (now - lastUpdate < 1000 / 60) {
            return;
        }
        const dx = (x - lastMouse[0]);
        const dy = (y - lastMouse[1]);
        lastMouse = [x, y];
        const screen = worldToScreen(user.position);
        const world = screenToWorld(screen.x + dx, screen.y - dy);
        $dragPosition = screenToWorld(x, dimentions.height - y);
        user.position = world;
        clickDistance += Math.sqrt(dx ** 2 + dy ** 2);
        $config = { ...$config };
        lastUpdate = now;
        user.align = false;
    }

    function handleMouseUp() {
        lastMouse = null;
        $dragState = null;
        $isDraggingFinished = true;
        $config = { ...$config };
        if ($alignSide) {
            $config.align.alignSide = $alignSide;
            $alignSide = undefined;
            $config.users = Object.fromEntries(Object.entries($config.users).map(([id, user]) => {
                user.align = true;
                return [id, user];
            }));
        }
    }

    function handleMouseDown(x: number, y: number) {
        const screen = worldToScreen(user.position)
            .add({ x: 0, y: -OFFSET / 2 })
            .max(Vec2.ZERO)
            .min({ x: dimentions.width, y: dimentions.height })
            .add({ x: 0, y: OFFSET / 2 });
        const world = screenToWorld(screen.x, screen.y);
        user.position = world;

        lastMouse = [x, y];
        $dragState = {
            type: 'user',
            id,
            time: performance.now(),
            x,
            y,
        };
        clickTime = performance.now();
        clickDistance = 0;
        user.lastDraggedAt = Date.now();
    }

    function getPosition(rect: { width: number; height: number }, offset: [number, number] = [0, OFFSET]): [number, number] {
        const margin = 8;
        const position = user.position || [0, 0];
        const screen = worldToScreen({ x: position.x + offset[0], y: position.y + offset[1] });
        const clamped = screen
            .add({ x: -rect.width / 2, y: -rect.height })
            .max({ x: margin, y: margin })
            .min({ x: dimentions.width - rect.width - margin, y: dimentions.height - rect.height - margin });
        return [clamped.x, clamped.y];
    }

    function getStyle(
        rect: { width: number; height: number },
        _config: Config,
        _view: Mat4,
        _directions: { width: number; height: number },
        offset: [number, number] = [0, OFFSET],
    ) {
        const clamped = getPosition(rect, offset);
        return `
            left: ${clamped[0]}px;
            bottom: ${clamped[1]}px;
        `;
    }

    function worldToScreen(position: Vec2Like) {
        const screen = $view.transform2(position);
        const zeroToOne = screen.scale(0.5).add({ x: 0.5, y: 0.5 });
        const screenSpace = zeroToOne.mul({ x: dimentions.width, y: dimentions.height });
        return screenSpace;
    }

    function screenToWorld(x: number, y: number) {
        const zeroToOne = new Vec2(x, y).mul({ x: 1 / dimentions.width, y: 1 / dimentions.height });
        const screen = zeroToOne.sub({ x: 0.5, y: 0.5 }).scale(2);
        const world = $view.inverse().transform2(screen);
        return world;
    }

    function handleKeyDown(e: KeyboardEvent) {
        const KEY_MAP = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
        };
        if (e.key === 'r') {
            user.position = new Vec2(dimentions.width / 2, dimentions.height / 2);
            $config = { ...$config };
        }
        const found = Object.entries(KEY_MAP).find(([key]) => key === e.key);
        if (found) {
            e.preventDefault();
            const [dx, dy] = found[1];
            let factor = e.ctrlKey ? 1 : e.shiftKey ? 100 : 10;
            user.position = Vec2.from(user.position).add({ x: dx * factor, y: dy * factor });
            $config = { ...$config };
            return;
        }
    }

    function handleMouseWheel(e: WheelEvent) {
        const scaleLevel = Math.log2(user.scale);
        const scale = Math.pow(2, scaleLevel - e.deltaY / 1000);
        user.scale = BetterMath.clamp(scale, 0.1, 5);
        $config = { ...$config };
    }
</script>

<svelte:window
    on:mousemove={(event) => {
        if (lastMouse) {
            const x = event.clientX;
            const y = event.clientY;
            handleMouseMove(x, y);
        }
    }}
    on:mouseup={() => {
        if (lastMouse) {
            handleMouseUp();
        }
    }}
    on:touchmove={(event) => {
        if (lastMouse) {
            const touch = event.touches[0];
            handleMouseMove(touch.clientX, touch.clientY);
        }
    }}
    on:touchend={() => {
        if (lastMouse) {
            handleMouseUp();
        }
    }}
/>

<button
    class="control"
    class:dragging={lastMouse || ($dragState?.type === 'user' && $dragState.id == id)}
    bind:this={element}
    style={getStyle(rect, $config, $view, dimentions)}
    on:mousedown={(event) => handleMouseDown(event.clientX, event.clientY)}
    on:touchstart={(event) => {
        event.preventDefault();
        const touch = event.touches[0];
        handleMouseDown(touch.clientX, touch.clientY);
    }}
    on:click={() => {
        const elapsed = performance.now() - clickTime;
        if (elapsed > 200 || clickDistance > 2) {
            return;
        }
        $heldUser = id;
    }}
    on:keydown={handleKeyDown}
    on:wheel={handleMouseWheel}
    draggable="false"
    style:opacity={$dragState?.type === 'user' && $dragState.id != id ? 0.2 : 1}
>
    {#if !lastMouse}
        <Tooltip>
            <p class="action-hint">
                <i class="ti ti-pointer"></i>
                <small>
                    クリックで
                </small>
                <b>
                    設定
                    <i class="ti ti-settings"></i>
                </b>
            </p>
            <p class="action-hint">
                <i class="ti ti-hand-stop"></i>
                <small>
                    つかんで
                </small>
                <b>
                    移動
                    <i class="ti ti-drag-drop"></i>
                </b>
            </p>
            <p class="action-hint">
                <i class="ti ti-mouse"></i>
                <small>
                    スクロールで
                </small>
                <b>
                    拡大縮小
                    <i class="ti ti-zoom-in"></i>
                </b>
            </p>
        </Tooltip>
    {/if}
    <i class="grip ti ti-grip-vertical"></i>
    <span class="nick">{state.nick}</span>
</button>

{#if $heldUser == id}
    <div
        class="settings"
        style={getStyle(rect, $config, $view, dimentions, [0, 100])}
        style:opacity={$heldUser && $heldUser != id ? 0.2 : 1}
        class:side-right={user.position.x > 0}
    >
        <UserSettings {overlayApp} {state} {id} />
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
                content: '';
                position: absolute;
                right: -0.5rem;
                top: 50%;
                transform: translate(50%, -50%);
                border: 0.5rem solid transparent;
                border-left-color: var(--color-outline);
            }

            &::after {
                content: '';
                position: absolute;
                right: -0.49rem;
                top: 50%;
                transform: translate(50%, -50%);
                border: 0.5rem solid transparent;
                border-left-color: var(--color-bg-2);
            }
        }

        &:not(.side-right) {
            animation: slide-in-left 0.0621s forwards;
            &::before {
                content: '';
                position: absolute;
                left: -0.49rem;
                top: 50%;
                transform: translate(-50%, -50%);
                border: 0.5rem solid transparent;
                border-right-color: var(--color-bg-2);
            }
        }
    }

    @keyframes slide-in-right {
        0% {
            opacity: 0;
            transform: translate(-100%, 0) translate(-5rem, 0);
        }
        97.9% {
            transform: translate(-100%, 0) translate(-6.1rem, 0);
        }
        100% {
            transform: translate(-100%, 0) translate(-6rem, 0);
        }
    }

    @keyframes slide-in-left {
        0% {
            opacity: 0;
            transform: translate(50%, 0) translate(3rem, 0);
        }
        97.9% {
            transform: translate(50%, 0) translate(4.1rem, 0);
        }
        100% {
            transform: translate(50%, 0) translate(4rem, 0);
        }
    }

    .control {
        position: absolute;
        background: var(--color-bg-2);
        color: var(--color-1);
        border: 1px solid var(--color-1);
        outline: 0.25rem solid color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%);
        font-weight: 600;
        font-size: 0.9rem;
        padding: 1rem;
        height: 2rem;
        padding-left: 0;
        border-radius: 999rem;
        display: flex;
        align-items: center;
        white-space: nowrap;
        cursor: grab;
        z-index: 2;

        > .grip {
            border-radius: 100%;
            height: 2rem;
            width: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        > .nick {
            overflow: hidden;
            max-width: 5rem;
            text-overflow: ellipsis;
        }

        &.dragging,
        &:focus-visible,
        &:hover {
            background: var(--color-bg-2);
            color: var(--color-1);
            border: none;
            outline: 2px solid var(--color-1);
            outline-width: 2px;
            box-shadow: 0 0.3rem 0 0 color-mix(in srgb, var(--color-2) 100%, transparent 0%);
            margin-bottom: 1px;
            margin-left: 1px;
            transition: margin-bottom, outline-width, box-shadow 0.0621s;
            z-index: 3;
        }

        &:active {
            z-index: 3;
            cursor: grabbing;
            box-shadow: none;
            margin-bottom: -2px;
            margin-left: 1px;
            background: var(--color-1);
            transition: margin-bottom, box-shadow, background 0.0621s;
            color: var(--color-bg-2);
        }
    }

    .action-hint {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin: 0.5rem 0;

        > b {
            margin-left: auto;
            padding-left: 2rem;

            > i {
                margin-left: 0.25rem;
            }
        }

        i {
            font-size: 1rem;
        }
    }
</style>
