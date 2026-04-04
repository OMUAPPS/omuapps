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
{/if}

<style>
    main {
        position: absolute;
        inset: 0;
    }
</style>
