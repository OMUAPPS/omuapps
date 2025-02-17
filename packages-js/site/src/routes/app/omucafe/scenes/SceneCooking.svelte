<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import Kitchen from '../components/Kitchen.svelte';
    import OrderList from '../components/OrderList.svelte';
    import { game, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);

    const { scene } = game;
</script>

<main>
    <Kitchen />
    <OrderList />
</main>
<BackButton />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
    }
</style>
