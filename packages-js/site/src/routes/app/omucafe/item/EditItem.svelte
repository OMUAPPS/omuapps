<script lang="ts">
    import { ButtonMini, Tooltip } from '@omujs/ui';
    import { fetchImage, getAsset } from '../asset/asset.js';
    import FitInput from '../components//FitInput.svelte';
    import EditImage from '../components/EditImage.svelte';
    import TransformEdit from '../components/TransformEdit.svelte';
    import JsonDebugInfo from '../debug/JsonDebugInfo.svelte';
    import { uniqueId } from '../game/helper.js';
    import { createItem, type Item } from '../item/item.js';
    import { getGame } from '../omucafe-app.js';
    import type { DefaultBehaviors } from './behavior.js';
    import { createAction } from './behaviors/action.js';
    import ActionEdit from './behaviors/ActionEdit.svelte';
    import { createContainer } from './behaviors/container.js';
    import ContainerEdit from './behaviors/ContainerEdit.svelte';
    import { createHoldable } from './behaviors/holdable.js';
    import HoldableEdit from './behaviors/HoldableEdit.svelte';
    import { createLiquid } from './behaviors/liquid.js';
    import LiquidEdit from './behaviors/LiquidEdit.svelte';

    export let item: Item;

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
        action: {
            key: 'action',
            name: '特殊挙動',
            default: createAction({
                on: {},
            }),
            edit: ActionEdit,
        },
        liquid: {
            key: 'liquid',
            name: '液体',
            default: createLiquid(),
            edit: LiquidEdit,
        },
    } satisfies DefaultBehaviors;
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
            <ButtonMini on:click={() => {
                const newId = uniqueId();
                $gameConfig.items[newId] = createItem({
                    ...item,
                    id: newId,
                    name: `${item.name}の複製`,
                });
                $scene = {
                    type: 'item_edit',
                    id: newId,
                };
            }} primary>
                <Tooltip>
                    複製
                </Tooltip>
                <i class="ti ti-drag-drop-2"></i>
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
            <EditImage required image={item.image} handle={async (asset) => {
                if (!asset) return;
                item.image = asset;
                const image = await getAsset(item.image).then(fetchImage);
                item.bounds = {
                    min: { x: 0, y: 0 },
                    max: { x: image.width, y: image.height },
                };
            }} />
        </div>
        <TransformEdit bind:transform={item.transform} />
        <code>
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
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        display: flex;
        gap: 1rem;
    }

    .info {
        display: flex;
        align-items: stretch;
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

    .name {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--color-outline);
        margin-bottom: 0.5rem;
        padding-bottom: 1rem;

        > h1 {
            margin-right: auto;
        }
    }

    .image {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 1rem;
        height: 12rem;
        padding: 1rem 0;
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
        flex-direction: column;
        align-items: stretch;
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
