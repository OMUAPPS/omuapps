<script lang="ts">
    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import type { DocsData } from '$lib/server/docs';
    import { config, replaceConstants } from '../constants.js';
    import { docs } from '../stores.js';

    export let data: { page: DocsData };
    $: $docs = data.page;
    $: source = replaceConstants($docs.content, $config);
</script>

<Markdown {source} />
