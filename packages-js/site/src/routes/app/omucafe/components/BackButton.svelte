<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { getGame, lastSceneChange } from '../omucafe-app.js';
    import type { Scene } from '../scenes/scene.js';

    interface Props {
        to?: Scene;
        active?: boolean;
    }

    let { to = { type: 'main_menu' }, active = false }: Props = $props();

    const { scene } = getGame();

    function set() {
        if (!active) {
            return;
        }
        const time = performance.now();
        const elapsed = time - $lastSceneChange;
        if (elapsed < 100) {
            return;
        }
        $lastSceneChange = time;
        $scene = to;
    }
</script>

<svelte:window onkeydown={(event) => {
    if (event.key === 'Escape') {
        set();
    }
}} />

<button class="back" onclick={() => {
    set();
}}>
    <Tooltip>
        ESCキーでも戻れます
    </Tooltip>
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
