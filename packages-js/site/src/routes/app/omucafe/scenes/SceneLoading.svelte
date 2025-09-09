<script lang="ts">
    import { onMount } from 'svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from './scene.js';

    export let context: SceneContext;
    $: console.log('SceneLoading', context);

    const { omu, scene } = getGame();

    onMount(async () => {
        await omu.waitForReady();
        if ($scene.type !== 'loading') {
            return;
        }
        $scene = { type: 'main_menu' };
    });
</script>

<main>
    <h1>
        読み込み中…
    </h1>
    <small>
        開店準備をしています
    </small>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        top: 39%;
        bottom: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 3rem;
    }

    h1 {
        border-bottom: 1px solid var(--color-1);
        color: var(--color-1);
        padding-bottom: 0.25rem;
    }
</style>
