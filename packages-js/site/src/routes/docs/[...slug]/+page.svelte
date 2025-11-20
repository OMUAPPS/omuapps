<script lang="ts">
    import { run } from 'svelte/legacy';

    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import type { DocsData } from '$lib/server/docs';
    import { config, replaceConstants } from '../constants.js';
    import { docs } from '../stores.js';

    interface Props {
        data: { page: DocsData };
    }

    let { data }: Props = $props();
    run(() => {
        $docs = data.page;
    });
    let source = $derived(replaceConstants($docs.content, $config));
</script>

<Markdown {source} />
