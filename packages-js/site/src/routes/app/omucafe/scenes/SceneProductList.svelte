<script lang="ts">
    import { downloadFile } from '$lib/helper.js';
    import { Identifier } from '@omujs/omu';
    import { ByteReader, ByteWriter } from '@omujs/omu/bytebuffer.js';
    import { Button, FileDrop } from '@omujs/ui';
    import { onMount } from 'svelte';
    import BackButton from '../components/BackButton.svelte';
    import ProductList from '../components/ProductList.svelte';
    import { getAssetBuffer, uploadAsset, type Asset } from '../game/asset.js';
    import { getContext } from '../game/game.js';
    import { getGame, type GameConfig, type ResourceRegistry, type SceneContext, type States } from '../omucafe-app.js';

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
    })

    type GameData = {
        version: number;
        resources: ResourceRegistry;
        gameConfig: GameConfig;
        states: States;
    };

    async function handleExport() {
        const { gameConfigRegistry, resourcesRegistry, statesRegistry } = getGame();
        const gameConfig = await gameConfigRegistry.get();
        const resources = await resourcesRegistry.get();
        const states = await statesRegistry.get();
        const assets: Record<string, Asset> = {};
        const data: GameData = {
            version: 0,
            resources: {
                assets: assets,
            },
            gameConfig,
            states: states,
        }
        const dataStr = JSON.stringify(data);
        for (const [key, value] of Object.entries(resources.assets)) {
            if (!dataStr.includes(key)) continue;
            assets[key] = value;
        }
        const output = new ByteWriter();
        output.writeString(JSON.stringify(data));
        output.writeUint32(Object.keys(assets).length);
        for (const [key, asset] of Object.entries(assets)) {
            output.writeString(key);
            const buffer = await getAssetBuffer(asset);
            output.writeUint8Array(buffer);
        }
        downloadFile({
            filename: 'omu-cafe-export.omucafe',
            content: output.finish(),
            type: 'application/octet-stream',
        });
    }

    async function handleImport(files: FileList) {
        if (files.length !== 1) {
            throw new Error('FileDrop must receive only one file');
        }
        const file = files[0];
        if (!file.name.endsWith('.omucafe')) {
            throw new Error('Invalid file type. Please upload a .omucafe file.');
        }
        const reader = ByteReader.fromArrayBuffer(await file.arrayBuffer());
        const dataStr = reader.readString();
        const data: GameData = JSON.parse(dataStr);
        const assetCount = reader.readUint32();
        for (let i = 0; i < assetCount; i++) {
            const key = Identifier.fromKey(reader.readString());
            const buffer = reader.readUint8Array();
            await uploadAsset(key, buffer);
        }
        const { gameConfigRegistry, resourcesRegistry, statesRegistry } = getGame();
        await gameConfigRegistry.set(data.gameConfig);
        await resourcesRegistry.set(data.resources);
        await statesRegistry.set(data.states);
        const kitchenContext = getContext();
        kitchenContext.items = data.states.kitchen.items;
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
        <FileDrop handle={handleImport} accept=".omucafe">
            import
            <i class="ti ti-file-arrow-left"></i>
        </FileDrop>
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
