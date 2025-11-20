<script lang="ts">
    import { run } from 'svelte/legacy';

    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();
    run(() => {
        console.log('SceneProductEdit', context);
    });

    const { scene } = getGame();
</script>

{#if $scene.type === 'product_take_photo'}
    {@const id = $scene.id}
    <main>
        <h1>カウンターにアイテムを置いて写真を取ります</h1>
    </main>
    <BackButton to={{ type: 'product_edit', id }} active={context.active} />
{/if}

<style lang="scss">
    main {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding-top: 4rem;
        padding-bottom: 8rem;
        color: var(--color-1);
        display: flex;
        justify-content: center;
        gap: 1rem;
        background: linear-gradient(to top, transparent 0%, var(--color-bg-2) 100%);
        pointer-events: none;
    }

    h1 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
    }
</style>
