<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import { Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import type { DiscordOverlayApp, VoiceStateItem } from '../discord-overlay-app.js';

    export let dimentions: { width: number; height: number };
    export let overlayApp: DiscordOverlayApp;
    export let id: string;
    export let state: VoiceStateItem;
    
    const { config } = overlayApp;

    $: user = $config.users[id];

    let element: HTMLButtonElement;
    let lastMouse: [number, number] | null = null;
    let lastPosition: [number, number] = [0, 0];
    $: rect = element ? element.getBoundingClientRect() : { width: 0, height: 0 };
    $: position = user.position;
    $: zoom = 2 ** $config.zoom_level;

    function handleMouseMove(e: MouseEvent) {
        e.preventDefault();
        if (!lastMouse) return;
        const dx = (e.clientX - lastMouse[0]) / zoom;
        const dy = (e.clientY - lastMouse[1]) / zoom;
        user.position = position = [lastPosition[0] + dx, lastPosition[1] + dy];
        element.style.cssText = getStyle(rect, dimentions, position);
    }

    function handleMouseUp() {
        window.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        position = user.position;
        $config = { ...$config };
        lastMouse = null;
        $config.selected_user_id = null;
    }

    function handleMouseDown(e: MouseEvent) {
        lastMouse = [e.clientX, e.clientY];
        lastPosition = user.position;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        $config.selected_user_id = id;
    }

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    function getStyle(rect: { width:number, height:number }, dimentions: { width:number, height:number }, position: [number, number]) {
        const margin = 8;
        let camera = $config.camera_position;
        return `
            left: ${BetterMath.clamp((position[0] + camera[0]) * zoom + dimentions.width / 2 - rect.width / 2, margin, dimentions.width - rect.width - margin)}px;
            top: ${BetterMath.clamp((position[1] + camera[1]) * zoom + dimentions.height / 2 - rect.height / 2 + 162.1 * zoom + 20, margin, dimentions.height - rect.height - margin)}px;
        `;
    }

    function handleKeyDown(e: KeyboardEvent) {
        const KEY_MAP = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
        }
        const found = Object.entries(KEY_MAP).find(([key]) => key === e.key);
        if (found) {
            e.preventDefault();
            const [dx, dy] = found[1];
            let factor = e.ctrlKey ? 1 : e.shiftKey ? 100 : 10;
            factor /= zoom;
            user.position = position = [position[0] + dx * factor, position[1] + dy * factor];
            element.style.cssText = getStyle(rect, dimentions, position);
            $config = { ...$config };
        }
    }

    function handleMouseWheel(e: WheelEvent) {
        user.scale = Math.max(0.1, Math.min(10, user.scale - e.deltaY / 1000));
        $config = { ...$config };
    }
</script>

<button
    class="control"
    class:dragging={lastMouse}
    bind:this={element}
    style={getStyle(rect, dimentions, position)}
    on:mousedown={handleMouseDown}
    on:keydown={handleKeyDown}
    on:wheel={handleMouseWheel}
    draggable="false"
    style:opacity={$config.selected_user_id && $config.selected_user_id != id ? 0.2 : 1}
>
    {#if !lastMouse}
        <Tooltip>
            <p>
                <i class="ti ti-pointer"/>
                <small>
                    ドラッグで
                </small> <b>移動</b>
            </p>
            <p>
                <i class="ti ti-mouse"/>
                <small>
                    スクロールで
                </small> <b>拡大縮小</b>
            </p>
        </Tooltip>
    {/if}
    <i class="grip ti ti-grip-vertical"/>
    {state.nick}
</button>

<style lang="scss">
    .control {
        position: absolute;
        background: var(--color-bg-2);
        color: var(--color-1);
        border: 1px solid var(--color-1);
        outline: 0.25rem solid var(--color-outline);
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
        }

        &:active {
            z-index: 1;
            cursor: grabbing;
        }
    }
</style>
