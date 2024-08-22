<script lang="ts">
    import type { App } from '@omujs/omu';
    import { onDestroy } from 'svelte';
    import Header from './Header.svelte';
    import { client } from './stores.js';

    export let app: App;

    let title = '';
    let icon = '';
    let description = '';

    const unlisten = $client.onReady(() => {
        const metadata = app.metadata;
        if (!metadata) {
            return;
        }
        if (metadata.name) {
            title = $client.i18n.translate(metadata.name);
        }
        if (metadata.icon) {
            icon = $client.i18n.translate(metadata.icon);
        }
        if (metadata.description) {
            description = $client.i18n.translate(metadata.description);
        }
    });

    onDestroy(unlisten);
</script>

<Header {title} {icon} subtitle={description}>
    <slot />
</Header>
