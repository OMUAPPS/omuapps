<script lang="ts">
    import type { App } from '@omujs/omu';
    import { onDestroy } from 'svelte';
    import Header from './Header.svelte';
    import { omu } from './stores.js';

    export let app: App;

    let title = '';
    let icon = '';
    let description = '';

    let unlisten = () => {};
    $: {
        if ($omu) {
            unlisten();
            unlisten = $omu.onReady(() => {
                const metadata = app.metadata;
                if (!metadata) {
                    return;
                }
                if (metadata.name) {
                    title = $omu.i18n.translate(metadata.name);
                }
                if (metadata.icon) {
                    icon = $omu.i18n.translate(metadata.icon);
                }
                if (metadata.description) {
                    description = $omu.i18n.translate(metadata.description);
                }
            });
        }
    }

    onDestroy(unlisten);
</script>

<Header {title} {icon} subtitle={description}>
    <slot />
</Header>
