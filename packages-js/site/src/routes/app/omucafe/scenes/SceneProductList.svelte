<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import ProductList from '../components/ProductList.svelte';
    import { type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneProductList', context);
</script>

<main>
    <ProductList type="product" />
    <ProductList type="item" />
    <ProductList type="effect" />
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
