<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import type { Mat4 } from '$lib/math/mat4.js';
    import { Vec2, type PossibleVec2 } from '$lib/math/vec2.js';
    import { Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import { type Config, type DiscordOverlayApp, type UserConfig, type VoiceStateItem } from '../discord-overlay-app.js';
    import { dragPosition, dragUser, heldUser, isDraggingFinished } from '../states.js';
    import UserSettings from './UserSettings.svelte';

    export let view: Mat4;
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
    
    const hideAreaWidth = 240;
    const hideAreaMargin = 10;
    const OFFSET = 150;

    function isInHideArea(position: PossibleVec2): boolean {
        const leftTop = screenToWorld(dimentions.width - hideAreaWidth, dimentions.height - hideAreaMargin);
        const rightBottom = screenToWorld(dimentions.width, hideAreaMargin);
        const bounds = AABB2.from({
            min: leftTop,
            max: rightBottom,
        });
        return bounds.contains(position);
    }

    function handleMouseMove(e: MouseEvent) {
        e.preventDefault();
        if (!lastMouse) return;
        const now = performance.now();
        if (now - lastUpdate < 1000 / 60) {
            return;
        }
        const dx = (e.clientX - lastMouse[0]);
        const dy = (e.clientY - lastMouse[1]);
        lastMouse = [e.clientX, e.clientY];
        const screen = worldToScreen(user.position[0], user.position[1]);
        const world = screenToWorld(screen.x + dx, screen.y - dy);
        user.position = [world.x, world.y];
        $dragPosition = new Vec2(e.clientX, e.clientY);
        clickDistance += Math.sqrt(dx ** 2 + dy ** 2);
        user.show = !isInHideArea({ x: user.position[0], y: user.position[1]});
        $config = { ...$config };
        lastUpdate = now;
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
                .add({x: -rect.width / 2, y: -rect.height})
                .max({x: margin, y: margin})
                .min({x: dimentions.width - rect.width - margin, y: dimentions.height - rect.height - margin});
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
        const clamped = getPosition(rect, [offset[0], config.align.vertical === 'start' ?  -offset[1] : offset[1]]);
        return `
            left: ${clamped[0]}px;
            bottom: ${clamped[1]}px;
        `;
    }

    function worldToScreen(x: number, y: number) {
        const screen = view.transform2({x, y});
        const zeroToOne = screen.scale(0.5).add({x: 0.5, y: 0.5});
        const screenSpace = zeroToOne.mul({x: dimentions.width, y: dimentions.height});
        return screenSpace;
    }

    function screenToWorld(x: number, y: number) {
        const zeroToOne = new Vec2(x, y).mul({x: 1 / dimentions.width, y: 1 / dimentions.height});
        const screen = zeroToOne.sub({x: 0.5, y: 0.5}).scale(2);
        const world = view.inverse().transform2(screen);
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
            user.position = [0, 0];
            $config = { ...$config };
        }
        const found = Object.entries(KEY_MAP).find(([key]) => key === e.key);
        if (found) {
            e.preventDefault();
            const [dx, dy] = found[1];
            let factor = e.ctrlKey ? 1 : e.shiftKey ? 100 : 10;
            user.position = [user.position[0] + dx * factor, user.position[1] + dy * factor];
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
                    {$config.align.auto ? '並び替え' : '移動'}
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
        style={getStyle(rect, $config, view, dimentions, [0, 100])}
        style:opacity={$heldUser && $heldUser != id ? 0.2 : 1}
        class:side-right={user.position[0] > 0}
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
            margin-bottom: 2px;
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
