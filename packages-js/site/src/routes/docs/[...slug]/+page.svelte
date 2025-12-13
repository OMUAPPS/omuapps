<script lang="ts">

    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import { config, replaceConstants } from '../constants.js';
    import type { DocsData } from '../server.js';
    import { docs } from '../stores.js';

    interface Props {
        data: { page: DocsData };
    }

    let { data }: Props = $props();
    $effect(() => {
        $docs = data.page;
    });
    let source = $derived(replaceConstants(data.page.content, $config));
</script>

<svelte:head>
    <title>{data.page.meta.title || 'ドキュメント'} | OMUAPPS</title>
    <meta name="description" content={data.page.meta.description} />
    <link rel="canonical" href={`https://omuapps.com/docs/${data.page.slug}`} />
</svelte:head>

<Markdown {source} />
