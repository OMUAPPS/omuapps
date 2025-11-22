<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { RouletteApp } from '../roulette-app.js';
    import type { RouletteItem } from '../state.js';

    interface Props {
        index: number;
        item: RouletteItem;
        roulette: RouletteApp;
        disabled: boolean;
    }

    let {
        index,
        item = $bindable(),
        roulette,
        disabled,
    }: Props = $props();
</script>

<div class="entry">
    <span class="info">
        <span class="index">
            {index + 1}.
        </span>
        <input
            type="text"
            bind:value={item.name}
            oninput={() => {
                roulette.updateEntry(item);
            }}
            placeholder="エントリー名..."
        />
    </span>
    <button
        onclick={() => {
            roulette.removeEntry(item.id);
        }}
        {disabled}
    >
        <Tooltip>
            <span>エントリーを削除</span>
        </Tooltip>
        <i class="ti ti-x"></i>
    </button>
</div>

<style lang="scss">
    .entry {
        display: flex;
        align-items: center;
        margin-bottom: 0.25em;
        gap: 0.25rem;
    }

    .info {
        flex: 1;
        background: var(--color-bg-2);
        display: flex;
        align-items: baseline;
    }

    .index {
        width: 1rem;
        text-align: right;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-1);
        margin-left: 0.5rem;
        padding-right: 0.25rem;
    }

    input {
        flex: 1;
        background: transparent;
        border: none;
        font-size: 0.95rem;
        height: 2.5rem;
        padding: 0.5rem 0.25rem;

        &:hover {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            color: var(--color-1);
        }

        &::placeholder {
            font-size: 0.8rem;
        }
    }

    button {
        flex: 0;
        background: var(--color-bg-2);
        color: var(--color-1);
        outline-offset: -1px;
        border: none;
        padding: 0.75rem;
        margin-right: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:focus-visible,
        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            z-index: 1;
        }
    }
</style>
