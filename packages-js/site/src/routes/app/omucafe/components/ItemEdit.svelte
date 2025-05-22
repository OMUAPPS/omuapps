<script lang="ts">
    import { FileDrop, Textbox, Tooltip, type TypedComponent } from '@omujs/ui';
    import { fetchImage, getAsset, uploadAsset } from '../game/asset.js';
    import type { Behaviors } from '../game/behavior.js';
    import { createContainer } from '../game/behavior/container.js';
    import { createHoldable } from '../game/behavior/holdable.js';
    import { createSpawner } from '../game/behavior/spawner.js';
    import type { Item } from '../game/item.js';
    import AssetImage from './AssetImage.svelte';
    import ContainerEdit from './behavior/ContainerEdit.svelte';
    import HoldableEdit from './behavior/HoldableEdit.svelte';
    import SpawnerEdit from './behavior/SpawnerEdit.svelte';
    import TransformEdit from './TransformEdit.svelte';

    export let item: Item;

    type DefaultBehavior<T extends keyof Behaviors = keyof Behaviors> = {
        [key in T]?: {
            name: string;
            key: key;
            default: Behaviors[key];
            edit: TypedComponent<{
                behavior: Behaviors[key];
            }>;
        }
    }

    const BEHAVIROS = {
        container: {
            key: 'container',
            name: '容器',
            default: createContainer(),
            edit: ContainerEdit,
        },
        holdable: {
            key: 'holdable',
            name: '持てる',
            default: createHoldable(),
            edit: HoldableEdit,
        },
        spawner: {
            key: 'spawner',
            name: '生成',
            default: createSpawner({
                spawnItemId: item.id,
            }),
            edit: SpawnerEdit,
        },
    } satisfies DefaultBehavior;
</script>

<main>
    <div class="info">
        <div class="id">
            <small>ID</small>
            <p>{item.id}</p>
        </div>
        <div class="name">
            <Textbox bind:value={item.name} />
            <FileDrop handle={async (fileList) => {
                if (fileList.length !== 1) {
                    throw new Error('FileDrop must receive only one file');
                }
                item.image = await uploadAsset(fileList[0]);
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
        </div>
        <div class="image" class:no-image={!item.image}>
            {#if item.image}
                {@const asset = item.image}
                <AssetImage asset={asset} />
            {/if}
        </div>
        <TransformEdit bind:transform={item.transform} />
        <code>
            {JSON.stringify(item, null, 2)}
        </code>
    </div>
    <div class="behaviors"> 
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
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        display: flex;
        gap: 1rem;
    }

    .id {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;

        > small {
            font-size: 0.75rem;
            color: var(--color-text);
        }
        
        > p {
            color: var(--color-1);
        }
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
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .name {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        width: 20rem;
        gap: 1rem;
        border-bottom: 1px solid var(--color-outline);
        margin-bottom: 0.5rem;
        padding-bottom: 1rem;
    }

    .image {
        width: 100%;
        height: 10rem;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.no-image {
            border: 2px dashed var(--color-outline);
        }
    }

    .behaviors {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 4rem 3rem;
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

    code {
        white-space: pre-wrap;
        word-break: break-all;
        height: 18rem;
        overflow: auto;
        background: var(--color-bg-2);
        padding: 0.75rem;
    }
</style>
