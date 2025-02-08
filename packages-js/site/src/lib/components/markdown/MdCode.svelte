<script lang="ts">
    import { Tooltip } from '@omujs/ui';

    export let lang: string;
    // export let raw: string;
    export let text: string;

    $: lines = text.split('\n');

    let selectedLine: number | null = null;
</script>

<code>
    <span class="header">
        <small>{lang}</small>
        <button
            on:click={() => {
                navigator.clipboard.writeText(text);
            }}
        >
            <Tooltip>Copy</Tooltip>
            <i class="ti ti-copy"></i>
        </button>
    </span>
    {#each lines as line, i}
        <span
            on:mouseenter={() => (selectedLine = i)}
            on:mouseleave={() => (selectedLine = null)}
            role="button"
            tabindex="0"
            class="line"
            class:selected={selectedLine === i}
        >
            <span class="line-number">{i + 1}</span>
            {line}
            {#if i < lines.length - 1}
                <br />
            {/if}
        </span>
    {/each}
</code>

<style lang="scss">
    code {
        position: relative;
        display: flex;
        flex-direction: column;
        background-color: #f8f9f8;
        color: var(--color-text);
        padding: 1.5rem 0.5rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: 500;
        font-family: var(--font-mono);
        width: 100%;
        outline: 1px solid var(--color-outline);
        user-select: text;
    }

    .header {
        position: absolute;
        top: -0.75rem;
        width: calc(100% - 2.5rem);
        margin: 0 1rem;
        display: flex;
        justify-content: space-between;
        align-items: start;
        font-weight: 600;
        height: 1.5rem;

        > button {
            background: none;
            border: none;
            background: var(--color-1);
            padding: 0.5rem 1rem;
            border-radius: 3px;
            color: var(--color-bg-1);
            font-size: 0.8rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    
        > small {
            display: block;
            background-color: #f8f9f8;
            border-radius: 3px;
            padding: 0.2rem 0.5rem;
            color: var(--color-1);
            width: fit-content;
            outline: 1px solid var(--color-outline);
        }
    }


    .line-number {
        color: var(--color-outline);
        margin: 0 0.5rem;
        font-size: 0.7rem;
        font-weight: 400;
        user-select: none;
    }

    .line {
        display: flex;
        align-items: baseline;
        height: 1.5rem;
        user-select: text;

        &.selected {
            width: 100%;
            border-bottom: 1px solid var(--color-1);
        }
    }
</style>
