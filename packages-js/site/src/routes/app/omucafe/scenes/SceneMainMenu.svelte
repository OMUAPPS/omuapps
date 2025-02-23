<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { EXAMPLE } from '../example/example.js';
    import { builder, executeExpression, type Value } from '../game/script.js';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneMainMenu', context);

    const { scene, config, obs, omu } = getGame();

    function testScript() {
        const { e, c, v, ctx } = builder;
        const expression = e.of('main', [
            c.store(v.string('x'), v.number(42)),
            c.store(v.string('y'), v.string('hello')),
            c.call(v.variable('debug'), v.variable('y')),
            c.return(v.variable('x')),
        ]);

        const context = ctx.empty();
        context.variables.debug = v.bind((args: Value[]) => {
            console.log(args);
            return v.void();
        });
        const result = executeExpression(context, expression); // hello
        console.log('result', result); // result 42
    }
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
        // $config = DEFAULT_CONFIG;
        $config = EXAMPLE;
    }}>
        設定をリセット
    </button>
    <button on:click={testScript}>
        テスト
    </button>
</div>
