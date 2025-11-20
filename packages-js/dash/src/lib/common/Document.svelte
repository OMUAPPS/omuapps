<script lang="ts">
    import { default as SvelteMarkdown } from '@humanspeak/svelte-markdown';
    import DocumentLink from './DocumentLink.svelte';
    import DocumentList from './DocumentList.svelte';
    import DocumentStrong from './DocumentStrong.svelte';

    interface Props {
        source: string;
    }

    let { source }: Props = $props();
</script>

<div class="markdown">
    <SvelteMarkdown {source} renderers={{
        link: DocumentLink,
        strong: DocumentStrong,
        list: DocumentList,
    }} />
</div>

<style lang="scss">
    .markdown {
        text-align: left;
        color: var(--color-text);
        font-weight: 500;
        font-size: 1rem;

        > :global(h1) {
            color: var(--color-1);
            margin-bottom: 0.5rem;
        }

        > :global(h2) {
            color: var(--color-1);
            margin-top: 3rem;
            margin-bottom: 1rem;
        }

        > :global(h3) {
            color: var(--color-1);
            margin-top: 2rem;
            margin-bottom: 0.5rem;
        }
    }
</style>
