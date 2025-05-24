<script lang="ts">
    import { Textbox } from '@omujs/ui';
    import BackButton from '../components/BackButton.svelte';
    import ProductList from '../components/ProductList.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;

    const { scene, config } = getGame();

    let container: HTMLElement;

    $: if (container) {
        container.scrollTo({top: $config.scenes.product_list.scroll});
    }

    let search: string = '';
</script>

<main class="omu-scroll" bind:this={container} on:scroll={() => {
    if ($scene.type !== 'product_list') return;
    $config.scenes.product_list.scroll = container.scrollTop;
}}>
    <Textbox bind:value={search} focused />
    <ProductList type="product" {search}/>
    <ProductList type="item" {search}/>
    <ProductList type="effect" {search}/>
</main>
<BackButton active={context.active} />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 8%;
        padding-left: 2rem;
        width: 24rem;
        gap: 1rem;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }
</style>
