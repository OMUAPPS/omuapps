<script lang="ts">
    import { OmuPermissions, type Omu } from '@omujs/omu';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();

    import { browser } from '$app/environment';
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import type { RenderPipeline } from '$lib/components/canvas/pipeline';
    import { fade } from 'svelte/transition';
    import { Game } from '../../core/game';
    import { GameState } from '../../core/game-state';
    import { OmucafeApp } from '../../omucafe-app';

    let game: Game | undefined = $state();

    async function setPipeline(pipeline: RenderPipeline) {
        await omu.waitForReady();
        const states = new GameState(OmucafeApp.getInstance());
        await states.wait();
        game = new Game(OmucafeApp.getInstance(), pipeline, states);
        await game.startLoop();
    }

    if (browser) {
        new OmucafeApp(omu, 'overlay');
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }

    let scene = $derived(game?.states.scene.store);
    const transition = $derived(game?.states.transition.store);
</script>

<main>
    <Canvas {setPipeline} />
    {#if $scene && game}
        {@const Component = $scene && game?.scene.getComponent($scene)}
        {#key Component}
            {#if Component && $transition && (!$transition.current || $transition.current.to.type === $scene.type)}
                <div class="screen" transition:fade={{ duration: 250 }}>
                    <!-- Union vs Intersection -->
                    <Component scene={$scene as never} {game} />
                </div>
            {/if}
        {/key}
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
    }
</style>
