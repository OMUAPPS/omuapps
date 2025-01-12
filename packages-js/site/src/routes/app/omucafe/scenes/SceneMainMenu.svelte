<script lang="ts">
    import { DEFAULT_CONFIG, game, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneMainMenu', context);

    const { scene, config } = game;
</script>

<h1>
    おむカフェ
</h1>

<div>
    <button on:click={() => {
        $scene = { type: 'photo_mode' };
    }}>
        写真モード
    </button>
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
