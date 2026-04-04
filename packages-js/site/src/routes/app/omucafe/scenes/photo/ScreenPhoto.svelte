<script lang="ts">
    import type { Game } from '../../core/game';
    import type { ScenePhotoData } from './photo';

    interface Props {
        game: Game;
        scene: ScenePhotoData;
    }

    let { game, scene }: Props = $props();
</script>

<main>
    <button onclick={() => {
        game.startTransition({
            type: 'main_menu',
        });
    }}>
        menu
    </button>
    <button onclick={() => {
        game.startTransition({
            type: 'factory',
        });
    }}>
        factory
    </button>
</main>

<style>
    main {
        position: absolute;
        inset: 0;
    }
</style>
