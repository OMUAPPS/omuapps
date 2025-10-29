<script lang="ts">
    import { Button, ButtonMini, Checkbox, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import BackButton from '../components/BackButton.svelte';
    import { GameData } from '../game/gamedata.js';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import MenuRenderer from './MenuRenderer.svelte';
    import ProductList from './ProductList.svelte';

    export let context: SceneContext;

    const { scene, config, gameConfig } = getGame();

    let container: HTMLElement;

    $: if (container) {
        container.scrollTo({ top: $config.scenes.product_list.scroll });
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
    }} />
    <i class="ti ti-search"></i>
</span>
<main>
    <div class="list omu-scroll" bind:this={container} on:scroll={() => {
        if ($scene.type !== 'product_list') return;
        $config.scenes.product_list.scroll = container.scrollTop;
    }}>
        <div class="actions">
            <Button onclick={handleExport}>
                export
                <i class="ti ti-file-arrow-right"></i>
            </Button>
        </div>
        <ProductList search={$config.scenes.product_list.search} />
    </div>
    <div class="menu">
        <div class="menu-items">
            <h1>
                メニュー看板
            </h1>
            <span>
                表示する
                <Checkbox bind:value={$gameConfig.menu.enabled} />
            </span>
            {#each Object.entries($gameConfig.products)
                .filter(([id]) => !$gameConfig.menu.items.some((it) => it.product === id)) as [id, product] (id)}
                <div class="item">
                    <span>
                        <ButtonMini primary on:click={() => {
                            $gameConfig.menu.items = [
                                {
                                    product: id,
                                    picture: false,
                                    note: '',
                                },
                                ...$gameConfig.menu.items,
                            ];
                        }}>
                            <Tooltip>
                                追加
                            </Tooltip>
                            <i class="ti ti-plus"></i>
                        </ButtonMini>
                        {product.name}
                    </span>
                </div>
            {/each}
            <hr>
            {#each $gameConfig.menu.items as entry, index (index)}
                {@const product = $gameConfig.products[entry.product]}
                <div class="item">
                    <span>
                        <ButtonMini primary on:click={() => {
                            $gameConfig.menu.items = $gameConfig.menu.items.filter((_, i) => i !== index);
                        }}>
                            <Tooltip>
                                消す
                            </Tooltip>
                            <i class="ti ti-minus"></i>
                        </ButtonMini>
                        {product.name}
                    </span>
                </div>
            {/each}
        </div>
        <MenuRenderer />
    </div>
</main>
<BackButton active={context.active} />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        background: color-mix(in srgb, var(--color-bg-1) 90%, transparent 0%);
    }

    .list {
        display: flex;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 1rem;
        padding-left: 2rem;
        padding-right: 1.5rem;
        width: 24rem;
        min-width: 24rem;
        gap: 1rem;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    h1 {
        color: var(--color-1);
        filter: drop-shadow(2px 2px 0px #fff8);
        white-space: nowrap;
    }

    .menu {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10%;
    }

    .menu-items {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-right: 3rem;

        > hr {
            margin: 0.5rem 0;
        }

        > .item {
            background: var(--color-bg-2);
            padding: 0.75rem 1rem;
        }
    }

    span {
        display: flex;
        align-items: center;
        gap: 1rem;
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
