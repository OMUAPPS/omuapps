<script lang="ts">
    import { onMount } from 'svelte';
    import BackButton from '../components/BackButton.svelte';
    import ProductList from '../components/ProductList.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;

    const { scene, config } = getGame();

    let container: HTMLElement;

    $: if (container) {
        container.scrollTo({top: $config.scenes.product_list.scroll});
    }

    let searchElement: HTMLInputElement;

    onMount(() => {
        searchElement.focus();
    })
</script>

<main class="omu-scroll" bind:this={container} on:scroll={() => {
    if ($scene.type !== 'product_list') return;
    $config.scenes.product_list.scroll = container.scrollTop;
}}>
    <span class="search">
        <input type="text" bind:this={searchElement} bind:value={$config.scenes.product_list.search} />
        <i class="ti ti-search"></i>
    </span>
    <ProductList type="product" search={$config.scenes.product_list.search}/>
    <ProductList type="item" search={$config.scenes.product_list.search}/>
    <ProductList type="effect" search={$config.scenes.product_list.search}/>
</main>
<BackButton active={context.active} />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 8rem;
        padding-left: 2rem;
        padding-right: 1.5rem;
        width: 24rem;
        gap: 1rem;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .search {
        position: relative;
        display: flex;
        align-items: baseline;
        color: var(--color-1);
        
        > input {
            border: 0;
            height: 2rem;
            background: none;
            flex: 1;
            padding: 0 0.25rem;
            border-bottom: 1px solid var(--color-1);

            &:focus {
                outline: 0;
            }
        }

        > i {
            position: absolute;
            right: 0;
            bottom: 0.5rem;
            padding: 0 0.5rem;
            pointer-events: none;
        }
    }
</style>
