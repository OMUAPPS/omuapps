<script lang="ts">
    import { ButtonMini, FileDrop, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { fetchImage, getAsset, uploadAssetByFile } from '../game/asset.js';
    import type { DefaultBehaviors } from '../game/behavior.js';
    import { createAction } from '../game/behavior/action.js';
    import { createContainer } from '../game/behavior/container.js';
    import { createHoldable } from '../game/behavior/holdable.js';
    import { createSpawner } from '../game/behavior/spawner.js';
    import type { Item } from '../game/item.js';
    import { getGame } from '../omucafe-app.js';
    import AssetImage from './AssetImage.svelte';
    import ActionEdit from './behavior/ActionEdit.svelte';
    import ContainerEdit from './behavior/ContainerEdit.svelte';
    import HoldableEdit from './behavior/HoldableEdit.svelte';
    import SpawnerEdit from './behavior/SpawnerEdit.svelte';
    import JsonDebugInfo from './debug/JsonDebugInfo.svelte';
    import FitInput from './scriptedit/FitInput.svelte';
    import TransformEdit from './TransformEdit.svelte';

    export let item: Item;
    export let created = false;
    let state: {type: 'opening_file'} | null = null;

    const { scene, gameConfig } = getGame();

    const BEHAVIROS = {
        holdable: {
            key: 'holdable',
            name: '持てる',
            default: createHoldable(),
            edit: HoldableEdit,
        },
        container: {
            key: 'container',
            name: '容器',
            default: createContainer(),
            edit: ContainerEdit,
        },
        spawner: {
            key: 'spawner',
            name: '生成',
            default: createSpawner({
                spawnItemId: item.id,
            }),
            edit: SpawnerEdit,
        },
        action: {
            key: 'action',
            name: '特殊挙動',
            default: createAction({
                on: {},
            }),
            edit: ActionEdit,
        },
    } satisfies DefaultBehaviors;

    let open: () => Promise<FileList>;

    onMount(async () => {
        if (!created || !open) return;
        state = { type: 'opening_file' };
        const fileList = await open();
        const file = fileList[0];
        item.name = file.name.split('.').at(0) ?? item.name;
        state = null;
    })
    
</script>

<main>
    <div class="info omu-scroll">
        <div class="name">
            <h1>
                <Tooltip>
                    {item.id}
                </Tooltip>
                <FitInput bind:value={item.name} />
            </h1>
            <ButtonMini on:click={() => {
                $scene = { type: 'product_list' };
                delete $gameConfig.items[item.id];
            }} primary>
                <Tooltip>
                    削除
                </Tooltip>
                <i class="ti ti-trash"></i>
            </ButtonMini>
            <ButtonMini on:click={async () => {
                await navigator.clipboard.writeText(item.id);
            }} primary>
                <Tooltip>
                    IDをコピー
                </Tooltip>
                <i class="ti ti-copy"></i>
            </ButtonMini>
        </div>
        <div class="image" class:no-image={!item.image}>
            {#if item.image}
                {@const asset = item.image}
                <AssetImage asset={asset} />
            {/if}
        </div>
        <FileDrop bind:open handle={async (fileList) => {
            if (fileList.length !== 1) {
                throw new Error('FileDrop must receive only one file');
            }
            item.image = await uploadAssetByFile(fileList[0]);
            const image = await getAsset(item.image).then(fetchImage);
            item.bounds = {
                min: { x: 0, y: 0 },
                max: { x: image.width, y: image.height },
            }
        }} primary={!item.image} accept="image/*">
            {#if item.image}
                <p>画像を変更</p>
            {:else}
                <p>画像を追加</p>
            {/if}
        </FileDrop>
        {item.effects}
        <TransformEdit bind:transform={item.transform} />
        <code>
            <!-- <JsonEdit bind:value={item.behaviors} /> -->
            <JsonDebugInfo value={item.behaviors} />
        </code>
    </div>
    <div class="behaviors omu-scroll"> 
        <h1>機能</h1>
        {#each Object.values(BEHAVIROS) as behavior, i (i)}
            <div class="behavior" class:active={item.behaviors[behavior.key]}>
                <button class="behavior-info" class:active={item.behaviors[behavior.key]} on:click={() => {
                    if (item.behaviors[behavior.key]) {
                        item.behaviors[behavior.key] = undefined;
                    } else {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        item.behaviors[behavior.key] = behavior.default;
                    }
                }} aria-label="削除">
                    <span>{behavior.name}</span>
                    {#if item.behaviors[behavior.key]}
                        <Tooltip>
                            機能を削除: {behavior.name}
                        </Tooltip>
                        <i class="ti ti-trash"></i>
                    {:else}
                        <Tooltip>
                            機能を追加: {behavior.name}
                        </Tooltip>
                        <i class="ti ti-plus"></i>
                    {/if}
                </button>
                {#if item.behaviors[behavior.key]}
                    <svelte:component
                        this={behavior.edit}
                        bind:behavior={item.behaviors[behavior.key]}
                    />
                {/if}
            </div>
        {/each}
    </div>
    {#if state?.type === 'opening_file'}
        <div class="overlay">
            ファイルを選択中…
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        display: flex;
        gap: 1rem;
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24rem;
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -0.5rem;
        opacity: 0.95;
    }

    .name {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        width: 21rem;
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 0.5rem;
        padding-bottom: 1rem;

        > h1 {
            margin-right: auto;
        }
    }

    .actions {
        margin-left: auto;
    }

    .info {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 8rem;
        padding-left: 2rem;
        width: 24rem;
        gap: 1rem;
        overflow-x: hidden;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .image {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 12rem;
        padding: 1rem;
        width: 100%;
        background: var(--color-bg-1);
        
        &.no-image {
            border: 2px dashed var(--color-outline);
        }
    }

    .behaviors {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 3rem 3rem;
        width: 24rem;
        overflow-y: auto;
    }

    .behavior {
        position: relative;
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        width: 100%;

        &.active {
            padding: 1rem;
            padding-top: 2rem;
            margin-bottom: 1rem;
            background: var(--color-bg-2);
            border: 1px solid var(--color-1);
            outline: 2px solid var(--color-bg-2);
        }
    }

    .behavior-info {
        position: absolute;
        left: -1rem;
        top: 0;
        width: 10rem;
        transform: translateY(-50%);
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        background: var(--color-1);
        color: var(--color-bg-2);
        border: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        border-radius: 2px;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }

        &.active {
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }
</style>
