<script lang="ts">
    import { game, type Scene } from '../omucafe-app.js';

    export let to: Scene = { type: 'main_menu' };

    const { scene } = game;
</script>

<button class="back" on:click={() => {
    $scene = to;
}}>
    <i class="ti ti-arrow-left"></i>
    戻る
</button>

<style lang="scss">
    .back {
        position: absolute;
        top: 1rem;
        left: 1rem;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        background: var(--color-1);
        color: var(--color-bg-2);
        border: none;
        cursor: pointer;
        border-radius: 2px;
    }
</style>
