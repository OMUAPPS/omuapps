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

<main>
    <button onclick={() => {
        $scene = {
            type: 'main_menu',
        };
    }}>
        bbb
    </button>
</main>

<style>
    main {
        position: absolute;
        inset: 0;
    }
</style>
