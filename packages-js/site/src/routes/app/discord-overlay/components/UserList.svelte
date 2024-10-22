<script lang="ts">
    import type { Config, DiscordOverlayApp, VoiceStateItem } from '../discord-overlay-app.js';
    import UserConfigEntry from './UserConfigEntry.svelte';

    export let overlayApp: DiscordOverlayApp;
    const { voiceState, config } = overlayApp;

    let draggedItem: string | null = null;
    let lastMouse: number | null = null;
    let offset: number = 0;
    let position: number = 0;

    function handleMouseMove(e: MouseEvent) {
        if (draggedItem === null) return;
        e.preventDefault();
        if (!lastMouse) return;
        const dy = (e.clientY - lastMouse);
        lastMouse = e.clientY;
        position = position + dy;
        test(e);
    }

    function handleMouseUp() {
        if (draggedItem && selected) {
            insert(draggedItem, selected, selectedSide!);
        }
        draggedItem = null;
        lastMouse = null;
        selected = null;
        selectedSide = null;
        position = 0;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }

    function handleMouseDown(event: MouseEvent) {
        if (!draggedItem) return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        entryElements = Object.fromEntries(Object.entries(entryElements).filter(([, element]) => element));
        lastMouse = event.clientY;
        const listRect = list!.getBoundingClientRect();
        const entryRect = entryElements[draggedItem]!.getBoundingClientRect();
        offset = entryRect.top - listRect.top;
    }

    let list: HTMLElement | null = null;
    let entryElements: Record<string, HTMLElement> = {};
    let selected: string | null = null;
    let selectedSide: 'top' | 'bottom' | null = null;
    
    function test(event: MouseEvent) {
        const entries = Object.entries(entryElements).sort(([a], [b]) => $config.users[a].order - $config.users[b].order);
        if (Object.keys(entries).length < 2) {
            selected = null;
            selectedSide = null;
            return;
        }
        for (const [id, entry] of entries) {
            if (id === draggedItem) continue;
            const rect = entry.getBoundingClientRect();
            const hovered = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            const halfSize = (rect.bottom - rect.top) / 2;
            const side = event.clientY - rect.top > halfSize ? 'bottom' : 'top';
            if (hovered) {
                selected = id;
                selectedSide = side;
                return;
            }
        }
        const first = entries[0];
        const last = entries[entries.length - 1];
        if (event.clientY < first[1].getBoundingClientRect().top) {
            if (first[0] === draggedItem) {
                selected = null;
                selectedSide = null;
            } else {
                selected = first[0];
                selectedSide = 'top';
            }
        } else if (last && event.clientY > last[1].getBoundingClientRect().bottom) {
            if (last[0] === draggedItem) {
                selected = null;
                selectedSide = null;
            } else {
                selected = last[0];
                selectedSide = 'bottom';
            }
        }
    }

    function insert(fromId: string, toId: string, side: 'top' | 'bottom') {
        const entries = Object.entries($voiceState).sort(([a], [b]) => $config.users[a].order - $config.users[b].order);
        let index = 0;
        for (const [id,] of entries) {
            $config.users[id].order = index++;
        }
        for (const [id,] of entries) {
            if (id === fromId) {
                $config.users[fromId].order = $config.users[toId].order + (side === 'top' ? -0.5 : 0.5);
            }
        }
    }

    function getEntries(voiceState: Record<string, VoiceStateItem>, config: Config) {
        return Object.entries(voiceState).sort(([a], [b]) => config.users[a].order - config.users[b].order);
    }
</script>

<div class="list" bind:this={list} class:dragging={!!draggedItem}>
    {#each getEntries($voiceState, $config) as [id, state] (id)}
        {@const dragging = draggedItem == id}
        <div class="entry" bind:this={entryElements[id]}>
            <div
                class="entry-inner"
                class:dragging={dragging}
                class:selected={selected == id}
                class:side-top={selectedSide == 'top'}
                style:top={`${dragging ? position + offset : 0}px`}
            >
                <UserConfigEntry {overlayApp} {id} {state} {dragging} on:mousedown={(event) => {
                    draggedItem = id;
                    handleMouseDown(event);
                }}/>
            </div>
        </div>
    {:else}
        <p>
            まだ誰も居ないようです…
            <i class="ti ti-user-off"/>
        </p>
        <small>誰かがボイスチャンネルに入ると表示されます</small>
    {/each}
</div>

<style lang="scss">
    .list {
        position: relative;
        overflow-x: hidden;
        overflow-y: visible;
        height: 100%;

        &.dragging {
            pointer-events: none;
        }
    }

    .entry {
        height: 3rem;
    }

    .entry-inner {
        &.dragging {
            position: absolute;
            left: 0;
            right: 0;
            z-index: 100;
            opacity: 0.4;
            pointer-events: none;
            animation: drag 0.1621s forwards;
        }
    
        &.selected {
            &.side-top {
                border-top: 1px solid var(--color-1);
            }
    
            &:not(.side-top) {
                border-bottom: 1px solid var(--color-1);
            }
        }
    }

    @keyframes drag {
        0% {
            transform: translateX(0);
        }
        25.25% {
            transform: translateX(1.1rem);
        }
        100% {
            transform: translateX(1rem);
        }
    }
</style>
