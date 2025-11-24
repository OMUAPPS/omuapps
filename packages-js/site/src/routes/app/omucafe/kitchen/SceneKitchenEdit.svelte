<script lang="ts">
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';

    export let context: SceneContext;
    $: console.log('SceneKitchenEdit', context);

    const { scene } = getGame();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />

<main>
    <h1>
        キッチン整理
    </h1>
    <small>
        ESCキーで終了
    </small>
</main>

<style>
    main {
        position: absolute;
        left: 0;
        top: 6%;
        padding: 1rem 8rem;
        padding-left: 10%;
        background: linear-gradient(
            to right,
            color-mix(in srgb, var(--color-bg-2) 98%, transparent 0%) 0%,
            color-mix(in srgb, var(--color-bg-2) 60%, transparent 0%) 80%,
            color-mix(in srgb, var(--color-bg-2) 20%, transparent 0%) 100%
        );
        color: var(--color-1);
        display: flex;
        flex-direction: column;
        border-right: 2px solid var(--color-bg-2);
    }

    h1 {
        border-bottom: 1px solid var(--color-1);
        color: var(--color-1);
        padding-bottom: 0.25rem;
        margin-bottom: 0.5rem;
    }

    small {
        color: var(--color-text);
        font-size: 0.8rem;
    }
</style>
