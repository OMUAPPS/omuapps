<script lang="ts">
    import type { Game } from '../../core/game';
    import type { SceneMainMenuData } from './mainmenu';

    interface Props {
        scene: SceneMainMenuData;
        game: Game;
    }

    let { game }: Props = $props();

    const scene = game.states.scene.store;
</script>

<main>
    <button onclick={() => {
        $scene = {
            type: 'kitchen',
        };
    }}>
        aaa
    </button>
</main>

<style>
    main {
        position: absolute;
        inset: 0;
    }
</style>
