<script lang="ts">
    import SvelteMarkdown from 'svelte-markdown';
    import MdCode from './MdCode.svelte';
    import MdCodeSpan from './MdCodeSpan.svelte';

    export let source: string;
</script>

<div class="markdown">
    <SvelteMarkdown
        {source}
        renderers={{
            code: MdCode,
            codespan: MdCodeSpan,
        }}
    />
</div>

<style lang="scss">
    .markdown {
        display: flex;
        flex-direction: column;
        align-items: start;
        padding: 1rem 0;
        max-width: 800px;
        text-wrap: wrap;
        white-space: pre-wrap;
        font-size: 0.9rem;

        :global(h1) {
            font-size: 2rem;
            margin: 2rem 0 1rem;
        }

        :global(h2) {
            font-size: 1.5rem;
            margin: 2.5rem 0 1.5rem;
            color: var(--color-1);
            border-left: 2px solid var(--color-1);
            padding-left: 1rem;
        }

        :global(h3) {
            font-size: 1.25rem;
            margin: 1.25rem 0 0.5rem;
        }
    }
</style>
