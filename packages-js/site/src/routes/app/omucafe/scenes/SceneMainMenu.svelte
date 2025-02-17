<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { DEFAULT_CONFIG, getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneMainMenu', context);

    const { scene, config, obs, omu } = getGame();
</script>

<div>
    <AssetButton {obs} {omu} />
    <button on:click={() => {
        $scene = { type: 'cooking' };
    }}>
        料理
    </button>
    <button on:click={() => {
        $scene = { type: 'product_list' };
    }}>
        商品一覧
    </button>
    <button on:click={() => {
        $config = DEFAULT_CONFIG;
    }}>
        設定をリセット
    </button>
</div>
