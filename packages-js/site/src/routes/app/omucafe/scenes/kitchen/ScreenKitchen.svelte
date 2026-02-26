<script lang="ts">
    import { AssetButton } from '@omujs/ui';
    import { OMUCAFE_OVERLAY_APP } from '../../app';
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
    <div class="asset">
        <AssetButton asset={OMUCAFE_OVERLAY_APP} single />
    </div>
</main>

<style>
    main {
        position: absolute;
        inset: 0;
    }

    .asset {
    }
</style>
