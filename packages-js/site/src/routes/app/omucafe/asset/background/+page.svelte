<script lang="ts">
    import { App } from '@omujs/omu';
    import { BACKGROUND_ID } from '../../app.js';
    import KitchenRenderer from '../../components/KitchenRenderer.svelte';
    import { createGame } from '../../omucafe-app.js';

    createGame(new App(BACKGROUND_ID, {
        version: '0.0.1',
    }), 'background');
</script>

<KitchenRenderer side='background' />

<style lang="scss">
    :global(body) {
        background: transparent;
    }
</style>
