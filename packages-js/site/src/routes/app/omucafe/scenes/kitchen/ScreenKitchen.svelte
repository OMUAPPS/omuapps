<script lang="ts">
    import type { Game } from '../../core/game';
    import type { SceneKitchenData } from './kitchen';

    interface Props {
        scene: SceneKitchenData;
        game: Game;
    }

    let { scene = $bindable(), game }: Props = $props();
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
