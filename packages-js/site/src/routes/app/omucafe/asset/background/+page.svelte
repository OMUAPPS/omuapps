<script lang="ts">
    import { VERSION } from '$lib/version.js';
    import { App } from '@omujs/omu';
    import { BACKGROUND_ID } from '../../app.js';
    import KitchenRenderer from '../../components/KitchenRenderer.svelte';
    import { createGame } from '../../omucafe-app.js';

    const promise = createGame(new App(BACKGROUND_ID, {
        version: VERSION,
    }), 'background');
</script>

{#await promise then }
    <KitchenRenderer side='background' />
{/await}

<style lang="scss">
    :global(body) {
        background: transparent;
    }
</style>
