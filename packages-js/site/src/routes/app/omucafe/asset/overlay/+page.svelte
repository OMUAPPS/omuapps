<script lang="ts">
    import { App } from '@omujs/omu';
    import { APP_ID } from '../../app.js';
    import KitchenRenderer from '../../components/KitchenRenderer.svelte';
    import { createGame } from '../../omucafe-app.js';

    createGame(new App(APP_ID.join('assets', 'overlay'), {
        version: '0.0.1',
    }));
</script>

<KitchenRenderer side='overlay' />

<style lang="scss">
    :global(body) {
        background: transparent;
    }
</style>
