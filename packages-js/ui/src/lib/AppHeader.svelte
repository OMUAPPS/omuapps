<script lang="ts">

    import type { App } from '@omujs/omu';
    import { onMount } from 'svelte';
    import Header from './Header.svelte';
    import { omu } from './stores.js';

    interface Props {
        app: App;
        children?: import('svelte').Snippet;
    }

    let { app, children }: Props = $props();

    let title = $state('');
    let icon = $state('');
    let description = $state('');

    onMount(() => {
        return $omu.onReady(() => {
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
    });
</script>

<Header {title} {icon} subtitle={description}>
    {@render children?.()}
</Header>
