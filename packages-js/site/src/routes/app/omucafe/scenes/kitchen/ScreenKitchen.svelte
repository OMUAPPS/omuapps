<script lang="ts">
    import type { Game } from '../../core/game';
    import type { SceneKitchenData } from './kitchen';

    interface Props {
        scene: SceneKitchenData;
        game: Game;
    }

    let { game }: Props = $props();

    const scene = game.states.scene.store;
</script>

{#if game.side === 'client'}
    <main>
    </main>
{/if}

<style>
    main {
        position: absolute;
        inset: 0;
    }
</style>
