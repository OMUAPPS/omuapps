<script lang="ts">
    import type { RouletteApp } from '../roulette-app.js';
    import RouletteEntry from './RouletteEntry.svelte';

    interface Props {
        roulette: RouletteApp;
    }

    let { roulette }: Props = $props();
    const { entries, rouletteState: rouletteState } = roulette;
</script>

<div class="entries">
    {#each Object.values($entries) as item, index (index)}
        <RouletteEntry {index} {item} {roulette} disabled={$rouletteState.type !== 'idle'} />
    {:else}
        <div class="empty">
            1つ以上追加する必要があります
        </div>
    {/each}
</div>

<style lang="scss">
    .empty {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 0;
        color: var(--color-text);
        font-size: 0.8rem;
    }

    .entries {
        height: 100%;
        border-top: 1px solid var(--color-outline);
        border-bottom: 1px solid var(--color-outline);
        padding: 0.5rem 0;
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
