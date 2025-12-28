<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import type { RenderPipeline } from '$lib/components/canvas/pipeline';
    import { Game } from './core/game';
    import { GameState } from './core/game-state';
    import { OmucafeApp } from './omucafe-app';

    let game: Game | undefined = $state();
    let scene = $derived(game?.states.scene.store);

    async function setPipeline(pipeline: RenderPipeline) {
        const states = await GameState.new(OmucafeApp.getInstance().omu);
        game = new Game(OmucafeApp.getInstance(), pipeline, states);
        await game.loop();
    }
</script>

<main>
    <Canvas {setPipeline} />
    {#if $scene && game}
        {@const Component = $scene && game?.sceneSystem.getComponent($scene)}
        {#if Component}
            <!-- Union vs Intersection -->
            <Component scene={$scene as never} {game} />
        {/if}
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
