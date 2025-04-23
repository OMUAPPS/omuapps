<script lang="ts">
    import { App } from '@omujs/omu';
    import { OVERLAY_ID } from '../../app.js';
    import KitchenRenderer from '../../components/KitchenRenderer.svelte';
    import { createGame } from '../../omucafe-app.js';

    const promise = createGame(new App(OVERLAY_ID, {
        version: '0.0.1',
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
