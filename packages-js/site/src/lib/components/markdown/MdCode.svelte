<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import Highlight, { LineNumbers } from 'svelte-highlight';
    import bash from 'svelte-highlight/languages/bash';
    import typescript from 'svelte-highlight/languages/typescript';

    export let lang: string;
    export let text: string;

    let language = {
        typescript,
        bash,
    }[lang] || typescript;
</script>

<div class="code">
    <Highlight
        {language}
        code={text}
        let:highlighted
    >
        <LineNumbers {highlighted} />
    </Highlight>
    <button on:click={() => {
        navigator.clipboard.writeText(text);
    }} class="copy">
        <Tooltip>コピー</Tooltip>
        <i class="ti ti-clipboard"></i>
    </button>
</div>

<style lang="scss">
    .code {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: start;
        width: 100%;
        background: var(--langtag-background);
        outline: 1px solid var(--color-outline);
        border-radius: 3px;
        user-select: text;
        margin: 1rem 0;
        overflow-x: auto;
    }

    .copy {
        position: absolute;
        top: 0;
        right: 0;
        padding: 0.25rem 0.5rem;
        background: var(--color-bg-1);
        color: var(--color-1);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        padding: 0.5rem 1rem;
        margin: 0.5rem;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }

        &:active {
            animation: hop 0.0621s;
        }
    }

    @keyframes hop {
        0% {
            margin-right: 1rem;
        }

        25% {
            margin-right: calc(1rem + 2px);
        }

        75% {
            margin-right: calc(1rem - 2px);
        }

        100% {
            margin-right: 1rem;
        }
    }
</style>
