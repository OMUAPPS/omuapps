<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { RouletteApp } from '../roulette-app.js';
    import type { RouletteItem } from '../state.js';

    export let index: number;
    export let item: RouletteItem;
    export let roulette: RouletteApp;
    const { state } = roulette;
</script>

<div class="entry">
    <span class="index">
        {index + 1}.
    </span>
    <input
        type="text"
        bind:value={item.name}
        on:input={() => {
            roulette.updateEntry(item);
        }}
        placeholder="エントリー名..."
    />
    <button
        on:click={() => {
            roulette.removeEntry(item.id);
        }}
        disabled={$state.type !== 'idle'}
    >
        <Tooltip>
            <span>Remove</span>
        </Tooltip>
        <i class="ti ti-x" />
    </button>
</div>

<style lang="scss">
    .entry {
        display: flex;
        align-items: center;
        height: 3rem;
        gap: 0.5rem;
        background: var(--color-bg-1);
        padding: 0.5rem;

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -3px;
        }
    }

    .index {
        width: 1rem;
        text-align: right;
        font-size: 0.8rem;
        color: var(--color-1);
    }

    input {
        flex: 1;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--color-outline);
        font-size: 1rem;
        height: 100%;

        &:focus {
            outline: none;
            border-bottom: 2px solid var(--color-1);
        }

        &::placeholder {
            font-size: 0.8rem;
        }
    }

    button {
        flex: 0;
        background: var(--color-bg-2);
        width: 2rem;
        height: 100%;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            outline: 1px solid var(--color-1);
            z-index: 1;
        }
    }
</style>
