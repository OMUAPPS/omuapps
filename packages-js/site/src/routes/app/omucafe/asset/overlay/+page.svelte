<script lang="ts">
    import { VERSION } from '$lib/version.js';
    import { App } from '@omujs/omu';
    import { OVERLAY_ID } from '../../app.js';
    import KitchenRenderer from '../../components/KitchenRenderer.svelte';
    import { createGame } from '../../omucafe-app.js';

    const promise = createGame(new App(OVERLAY_ID, {
        version: VERSION,
    }), 'overlay');
</script>

{#await promise then }
    <KitchenRenderer side='overlay' />
{/await}

<style lang="scss">
    :global(body) {
        background: transparent;
    }
</style>
