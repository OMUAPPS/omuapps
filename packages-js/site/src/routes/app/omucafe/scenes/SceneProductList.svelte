<script lang="ts">
    import { Button } from '@omujs/ui';
    import { onMount } from 'svelte';
    import BackButton from '../components/BackButton.svelte';
    import ProductList from '../components/ProductList.svelte';
    import { GameData } from '../game/gamedata.js';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;

    const { scene, config } = getGame();

    let container: HTMLElement;

    $: if (container) {
        container.scrollTo({top: $config.scenes.product_list.scroll});
    }

    let searchElement: HTMLInputElement;

    onMount(() => {
        if (!searchElement) return;
        searchElement.focus();
    });

    async function handleExport() {
        const gameData = await GameData.create();
        gameData.download();
    }
</script>

<span class="search" class:active={$config.scenes.product_list.search}>
    <input type="text" bind:this={searchElement} bind:value={$config.scenes.product_list.search} on:blur={() => {
        if ($scene.type !== 'product_list') return;
        searchElement.focus();
    }}/>
    <i class="ti ti-search"></i>
</span>
<main class="omu-scroll" bind:this={container} on:scroll={() => {
    if ($scene.type !== 'product_list') return;
    $config.scenes.product_list.scroll = container.scrollTop;
}}>
    <div class="actions">
        <Button onclick={handleExport}>
            export
            <i class="ti ti-file-arrow-right"></i>
        </Button>
    </div>
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
        padding-top: 1rem;
        padding-left: 2rem;
        padding-right: 1.5rem;
        width: 24rem;
        gap: 1rem;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-bottom: 5rem;
    }

    .search {
        position: absolute;
        inset: 0;
        height: 7rem;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        width: 24rem;
        // background: linear-gradient(in oklab to bottom,rgba(246, 242, 235, 0.95) 0%, rgba(246, 242, 235, 0.95) 98%, rgba(246, 242, 235, 0) 100%);
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-1);
        color: var(--color-1);
        opacity: 0;
        z-index: 100;
        pointer-events: none;
        color: var(--color-text);

        &.active {
            opacity: 1;
            animation: fadeIn forwards 0.12621s;
        }
        
        > input {
            position: absolute;
            top: 1.1rem;
            margin: 2rem;
            left: 2rem;
            right: 0rem;
            border: 0;
            height: 2.5rem;
            background: none;
            flex: 1;
            padding: 0 0.25rem;
            font-size: 1.4rem;
            font-weight: 600;
            pointer-events: initial;
            color: var(--color-text);

            &:focus {
                outline: 0;
            }
        }

        > i {
            position: absolute;
            top: 3.75rem;
            left: 1.5rem;
            padding: 0 0.5rem;
            pointer-events: none;
            font-size: 1.5rem;
        }
    }

    @keyframes fadeIn {
        0% {
            transform: translateY(-1rem);
            opacity: 0;
            color: var(--color-bg-2);
            background: var(--color-1);
        }
        62% {
            transform: translateY(0.2rem);
            opacity: 0.98;
            color: var(--color-1);
        }
        82% {
            color: var(--color-text);
        }
        100% {
            transform: translateY(0);
            opacity: 1;
            color: var(--color-1);
        }
    }
</style>
