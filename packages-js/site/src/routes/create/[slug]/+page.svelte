<script lang="ts">
    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import type { DocsData } from '$lib/server/docs/index.js';
    import { docs } from '../stores.js';

    export let data: { page: DocsData };
    $: $docs = data.page;
</script>

<Markdown source={$docs.content} />
