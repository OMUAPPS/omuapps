<script lang="ts">
    import { ButtonMini, Tooltip } from '@omujs/ui';

    export let lang: string;
    // export let raw: string;
    export let text: string;

    $: lines = text.split('\n');

    let selectedLine: number | null = null;
    let isHovered = false;
</script>

<code on:mouseenter={() => (isHovered = true)} on:mouseleave={() => (isHovered = false)}>
    <span class="header">
        <small>{lang}</small>
        {#if isHovered}
            <ButtonMini
                on:click={() => {
                    navigator.clipboard.writeText(text);
                }}
            >
                <Tooltip>Copy</Tooltip>
                <i class="ti ti-copy"></i>
            </ButtonMini>
        {/if}
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
        display: flex;
        flex-direction: column;
        background-color: var(--color-bg-1);
        color: var(--color-1);
        padding: 0.5rem 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: 600;
        font-family: var(--font-mono);
        width: 100%;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    small {
        display: block;
        background-color: var(--color-bg-2);
        padding: 0.2rem 0.5rem;
        margin-bottom: 0.5rem;
        color: var(--color-2);
        height: 1.5rem;
        width: fit-content;
    }

    .line-number {
        color: var(--color-2);
        margin: 0 0.5rem;
        font-size: 0.9rem;
        font-weight: 400;
        user-select: none;
    }

    .line {
        display: flex;
        align-items: baseline;
        height: 1.5rem;
        user-select: text;
    }

    .selected {
        width: 100%;
        background-color: var(--color-bg-2);
    }
</style>
