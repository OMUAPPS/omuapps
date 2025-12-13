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
    let meta = $derived(data.page.meta);
</script>

<svelte:head>
    <title>{meta.title || 'ドキュメント'} | OMUAPPS</title>
    <meta name="description" content={meta.description} />
    <meta name="og:description" content={meta.description} />
    <meta name="og:title" content={meta.title}>
    {#if data.page.meta}
        <meta name="og:image" content={meta.image}>
    {/if}
    <meta name="og:url" content={`https://omuapps.com/docs/${data.page.slug}`} />
    <link rel="canonical" href={`https://omuapps.com/docs/${data.page.slug}`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={meta.title} />
    {#if meta.image}
        <meta name="twitter:image" content={meta.image} />
    {/if}
    <meta name="twitter:description" content={meta.description} />
    <meta name="twitter:domain" content="omuapps.com" />
    <meta name="twitter:site" content="@OMUAPPS" />
</svelte:head>

<Markdown {source} />
