<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import OrderList from '../components/OrderList.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);

    const { scene } = getGame();
</script>

<main>
    <OrderList />
</main>
<BackButton />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
    }
</style>
