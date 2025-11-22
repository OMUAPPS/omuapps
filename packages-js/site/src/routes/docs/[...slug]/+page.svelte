<script lang="ts">

    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import type { DocsData } from '$lib/server/docs';
    import { config, replaceConstants } from '../constants.js';
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

<Markdown {source} />
