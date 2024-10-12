<script lang="ts">
    import { BetterMath } from '$lib/math.js';
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

    function handleMouseMove(e: MouseEvent) {
        e.preventDefault();
        if (!lastMouse) return;
        const dx = e.clientX - lastMouse[0];
        const dy = e.clientY - lastMouse[1];
        user.position = position = [lastPosition[0] + dx, lastPosition[1] + dy];
        element.style.cssText = getStyle(rect, dimentions, position);
    }

    function handleMouseUp() {
        window.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        position = user.position;
        $config = { ...$config };
    }

    function handleMouseDown(e: MouseEvent) {
        lastMouse = [e.clientX, e.clientY];
        lastPosition = user.position;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    function getStyle(rect: { width:number, height:number }, dimentions: { width:number, height:number }, position: [number, number]) {
        const margin = 8;
        const zoom = 2 ** $config.zoom_level;
        return `
            left: ${BetterMath.clamp(position[0] * zoom + dimentions.width / 2 - rect.width / 2, margin, dimentions.width - rect.width - margin)}px;
            top: ${BetterMath.clamp(position[1] * zoom + dimentions.height / 2 - rect.height / 2 + 200 * zoom, margin, dimentions.height - rect.height - margin)}px;
        `;
    }
</script>

<button
    class="control"
    bind:this={element}
    style={getStyle(rect, dimentions, position)}
    on:mousedown={handleMouseDown}
    draggable="false"
>
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
