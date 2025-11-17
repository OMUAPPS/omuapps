<script lang="ts">
    import SvelteMarkdown from 'svelte-markdown';
    import MdCode from './MdCode.svelte';
    import MdCodeSpan from './MdCodeSpan.svelte';
    import MdImage from './MdImage.svelte';
    import MdLink from './MdLink.svelte';

    export let source: string;
</script>

<div class="markdown">
    <SvelteMarkdown
        {source}
        renderers={{
            code: MdCode,
            codespan: MdCodeSpan,
            link: MdLink,
            image: MdImage,
        }}
    />
</div>

<style lang="scss">
    .markdown {
        display: flex;
        flex-direction: column;
        align-items: start;
        padding: 1rem 0;
        text-wrap: wrap;
        font-size: 0.9rem;
        width: 100%;
        user-select: text;

        :global(h1) {
            font-size: 2rem;
            margin: 2rem 0 1rem;
        }

        :global(h2) {
            font-size: 1.5rem;
            margin: 4rem 0 1rem;
            color: var(--color-1);
            border-left: 4px solid var(--color-1);
            padding-left: 1rem;
        }

        :global(h3) {
            font-size: 1.25rem;
            margin: 1.25rem 0 0.5rem;
        }

        :global(ul),
        :global(ol) {
            margin: 1.25rem 1.5rem 0.5rem;
        }

        :global(p) {
            margin-top: 1rem;
        }

        :global(strong) {
            background: var(--color-1);
            color: var(--color-bg-2);
            padding: 0 0.25rem;
            margin: 0 0.25rem;
        }
    }
</style>
