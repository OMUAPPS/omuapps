<script lang="ts">
    import type { RouletteApp } from '../roulette-app.js';
    import RouletteEntry from './RouletteEntry.svelte';

    export let roulette: RouletteApp;
    const { entries } = roulette;
</script>

<div class="entries">
    {#each Object.entries($entries) as [id, item], index (id)}
        <RouletteEntry {index} {item} {roulette} />
    {/each}
</div>

<style lang="scss">
    .entries {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow: auto;
        padding: 0 0.25rem;
        margin: 1rem 1rem 1rem 0.75rem;
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
    }
</style>
