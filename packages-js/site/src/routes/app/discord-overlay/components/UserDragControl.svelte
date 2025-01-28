<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import type { Mat4 } from '$lib/math/mat4.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import { createUserConfig, type Config, type DiscordOverlayApp, type VoiceStateItem } from '../discord-overlay-app.js';
    import { dragPosition, dragUser, heldUser, isDraggingFinished } from '../states.js';
    import UserSettings from './UserSettings.svelte';

    export let view: Mat4;
    export let dimentions: { width: number; height: number };
    export let overlayApp: DiscordOverlayApp;
    export let id: string;
    export let state: VoiceStateItem;
    
    const { config } = overlayApp;

    $: user = $config.users[id] || createUserConfig();

    let element: HTMLButtonElement;
    let lastMouse: [number, number] | null = null;
    let clickTime = 0;
    let clickDistance = 0;
    let lastUpdate = performance.now();
    $: rect = element ? element.getBoundingClientRect() : { width: 0, height: 0 };
    $: position = user.position || [0, 0];
    
    const hideAreaWidth = 240;
    const hideAreaMargin = 10;
    const OFFSET = 150;

    function isInHideArea(position: Vec2): boolean {
        const leftTop = screenToWorld(dimentions.width - hideAreaWidth, hideAreaMargin);
        const rightBottom = screenToWorld(dimentions.width, dimentions.height - hideAreaMargin);
        const bounds = new AABB2(
            new Vec2(leftTop.x, rightBottom.y),
            new Vec2(rightBottom.x, leftTop.y)
        );
        return bounds.contains(position);
    }

    function handleMouseMove(e: MouseEvent) {
        e.preventDefault();
        if (!lastMouse) return;
        const dx = (e.clientX - lastMouse[0]);
        const dy = (e.clientY - lastMouse[1]);
        lastMouse = [e.clientX, e.clientY];
        const screen = worldToScreen(position[0], position[1]);
        const world = screenToWorld(screen.x + dx, screen.y - dy);
        user.position = position = [world.x, world.y];
        const a = worldToScreen(position[0], position[1] + OFFSET + rect.height / 2);
        $dragPosition = new Vec2(a.x, dimentions.height - a.y);
        clickDistance += Math.sqrt(dx ** 2 + dy ** 2);
        user.show = !isInHideArea(new Vec2(position[0], position[1]));

        const now = performance.now();
        if (now - lastUpdate > 1000 / 60) {
            $config = { ...$config };
            lastUpdate = now;
        }
    }

    function handleMouseUp() {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (!user.show) {
            const invisible = Object.entries($config.users)
                .filter(([,user]) => !user.show)
                .sort(([,a], [,b]) => b.position[1] - a.position[1])
                .map(([id]) => id);
            const index = invisible.indexOf(id);
            const hideAreaPosition = getHideAreaPosition(index);
            user.position = screenToWorld(hideAreaPosition[0] + rect.width / 2, hideAreaPosition[1] + OFFSET - rect.height / 2).toArray();
        }
        position = user.position;
        $config = { ...$config };
        lastMouse = null;
        $dragUser = null;
        $isDraggingFinished = user.show;
        if (!user.show) {
            $dragPosition = null;
        }
    }

    function handleMouseDown(e: MouseEvent) {
        if (!user.show) {
            const invisible = Object.entries($config.users)
                .filter(([,user]) => !user.show)
                .sort(([,a], [,b]) => b.position[1] - a.position[1])
                .map(([id]) => id);
            const index = invisible.indexOf(id);
            const hideAreaPosition = getHideAreaPosition(index);
            user.position = screenToWorld(hideAreaPosition[0] + rect.width / 2, hideAreaPosition[1] + OFFSET - rect.height / 2).toArray();
        }
        lastMouse = [e.clientX, e.clientY];
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        $dragUser = id;
        clickTime = performance.now();
        clickDistance = 0;
    }

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    function getHideAreaPosition(index: number): [number, number] {
        const invisible = Object.entries($config.users)
            .filter(([,user]) => !user.show)
            .sort(([,a], [,b]) => b.position[1] - a.position[1])
            .map(([id]) => id);
        const offset1 = -Math.min(60, (dimentions.height - 80) / invisible.length);
        const startY = dimentions.height - hideAreaMargin - 80;
        const y = startY + (index * offset1);
        return [dimentions.width - hideAreaWidth + hideAreaMargin + 20, y];
    }

    function getPosition(rect: { width: number, height: number }, offset: [number, number] = [0, OFFSET]): [number, number] {
        const show = user.show || $dragUser == id;
        if (show) {
            const margin = 8;
            const position = user.position || [0, 0];
            const screen = worldToScreen(position[0] + offset[0], position[1] + offset[1]);
            const clamped = screen
                .add(new Vec2(-rect.width / 2, -rect.height))
                .max(new Vec2(margin, margin))
                .min(new Vec2(dimentions.width - rect.width - margin, dimentions.height - rect.height - margin));
            return [clamped.x, clamped.y];
        }
        const invisible = Object.entries($config.users)
            .filter(([,user]) => !user.show)
            .sort(([,a], [,b]) => b.position[1] - a.position[1])
            .map(([id]) => id);
        const index = invisible.indexOf(id);
        return getHideAreaPosition(index);
    }

    function getStyle(
        rect: { width: number, height: number },
        config: Config,
        view: Mat4,
        directions: { width: number, height: number },
        offset: [number, number] = [0, OFFSET],
    ) {
        const clamped = getPosition(rect, offset);
        return `
            left: ${clamped[0]}px;
            bottom: ${clamped[1]}px;
        `;
    }

    function worldToScreen(x: number, y: number) {
        const world = new Vec2(x, y);
        const screen = view.xform2(world);
        const zeroToOne = screen.scale(0.5).add(new Vec2(0.5, 0.5));
        const screenSpace = zeroToOne.mul(new Vec2(dimentions.width, dimentions.height));
        return screenSpace;
    }

    function screenToWorld(x: number, y: number) {
        const zeroToOne = new Vec2(x, y).mul(new Vec2(1 / dimentions.width, 1 / dimentions.height));
        const screen = zeroToOne.sub(new Vec2(0.5, 0.5)).scale(2);
        const world = view.inverse().xform2(screen);
        return world;
    }

    function handleKeyDown(e: KeyboardEvent) {
        const KEY_MAP = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
        }
        if (e.key === 'r') {
            user.position = position = [0, 0];
            $config = { ...$config };
        }
        const found = Object.entries(KEY_MAP).find(([key]) => key === e.key);
        if (found) {
            e.preventDefault();
            const [dx, dy] = found[1];
            let factor = e.ctrlKey ? 1 : e.shiftKey ? 100 : 10;
            user.position = position = [position[0] + dx * factor, position[1] + dy * factor];
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

<button
    class="control"
    class:dragging={lastMouse || ($dragUser && $dragUser == id)}
    bind:this={element}
    style={getStyle(rect, $config, view, dimentions)}
    on:mousedown={handleMouseDown}
    on:click={() => {
        const elapsed = performance.now() - clickTime;
        if (elapsed > 200 || clickDistance > 2) {
            return;
        }
        $heldUser = $heldUser == id ? null : id;
    }}
    on:keydown={handleKeyDown}
    on:wheel={handleMouseWheel}
    draggable="false"
    style:opacity={$dragUser && $dragUser != id ? 0.2 : 1}
>
    {#if !lastMouse}
        <Tooltip>
            <p class="action-hint">
                <i class="ti ti-pointer"/>
                <small>
                    クリックで
                </small>
                <b>
                    設定
                    <i class="ti ti-settings"/>
                </b>
            </p>
            <p class="action-hint">
                <i class="ti ti-hand-stop"/>
                <small>
                    つかんで
                </small>
                <b>
                    {$config.align.auto ? '並び替え' : '移動'}
                    <i class="ti ti-drag-drop"/>
                </b>
            </p>
            <p class="action-hint">
                <i class="ti ti-mouse"/>
                <small>
                    スクロールで
                </small>
                <b>
                    拡大縮小
                    <i class="ti ti-zoom-in"/>
                </b>
            </p>
        </Tooltip>
    {/if}
    <i class="grip ti ti-grip-vertical"/>
    {state.nick}
</button>

{#if $heldUser == id}
    <div
        class="settings"
        style={getStyle(rect, $config, view, dimentions, [0, 100])}
        style:opacity={$heldUser && $heldUser != id ? 0.2 : 1}
        class:side-right={position[0] > 0}
    >
        <UserSettings {overlayApp} {state} {id} />
    </div>
{/if}

<style lang="scss">
    .settings {
        position: absolute;
        background: var(--color-bg-2);
        filter: drop-shadow(3px 5px 0 rgba(0, 0, 0, 0.0621)) drop-shadow(-3px -5px 10px rgba(0, 0, 0, 0.1621));
        outline: 1px solid var(--color-outline);
        border-radius: 0.25rem;
        z-index: 2;

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
                text-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.1621);
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

        &.dragging,
        &:focus-visible,
        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
            z-index: 3;
        }

        &:active {
            z-index: 3;
            cursor: grabbing;
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
