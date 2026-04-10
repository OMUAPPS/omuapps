<script lang="ts">
    import { Textbox, Tooltip } from '@omujs/ui';
    import EditTransform from '../../common/EditTransform.svelte';
    import { Game } from '../../core/game';
    import type { AttributeKey } from '../../item/attribute';
    import EditItemJson from './EditItemJson.svelte';
    import { preview } from './factory';

    interface Props {
        id: string;
    }

    let { id }: Props = $props();

    const game = Game.getInstance();

    const itemStore = $derived(game.item.items.getStore(id));

    let lastAttributeString = JSON.stringify($itemStore?.attrs);

    $effect.pre(() => {
        if (!$itemStore) return;
        const currentAttributeString = JSON.stringify($itemStore.attrs);
        if (lastAttributeString !== currentAttributeString) {
            game.item.updateItem($itemStore);
        }
        lastAttributeString = currentAttributeString;
    });

    function deleteAttribute(key: AttributeKey) {
        if (!$itemStore) return;
        delete $itemStore.attrs[key];
        $itemStore.attrs = $itemStore.attrs;
    }

    function addAttribute(event: Event & { currentTarget: HTMLSelectElement }) {
        const key = event.currentTarget.value as AttributeKey;
        const attribute = game.attribute.values[key];
        if (!attribute || !$itemStore) return;
        $itemStore.attrs[key] = attribute.create() as never;
    }
</script>

{#if $preview[id]}
    <div class="preview">
        <img src={$preview[id].url} alt="">
    </div>
{/if}
{#if $itemStore}
    <h2>名前</h2>
    <Textbox bind:value={$itemStore.name} />
    <h2>変形</h2>
    <EditTransform bind:transform={$itemStore.transform} />
    <h2>属性</h2>
    <div class="attributes">
        {#each Object.entries(game.attribute.values) as [key, attribute] (key)}
            {@const attr = $itemStore.attrs[key as AttributeKey]}
            {#if attr}
                <div class="attr">
                    <h3>
                        {attribute.name}
                        <button onclick={() => deleteAttribute(key as AttributeKey)}>
                            <Tooltip>削除</Tooltip>
                            <i class="ti ti-x"></i>
                        </button>
                    </h3>
                    <div class="body">
                        <attribute.editor
                            bind:attr={$itemStore.attrs[key as AttributeKey] as never}
                        />
                    </div>
                </div>
            {/if}
        {/each}

        <select onchange={addAttribute}>
            <option value="">
                追加
                <i class="ti ti-plus"></i>
            </option>
            {#each Object.entries(game.attribute.values) as [key, attribute] (key)}
                {@const attr = $itemStore.attrs[key as AttributeKey]}
                {#if !attr}
                    <option value={key}>{attribute.name}</option>
                {/if}
            {/each}
        </select>
    </div>
    <h2>JSON</h2>
    <EditItemJson bind:item={$itemStore} />
{/if}

<style lang="scss">
    .preview {
        background: var(--color-bg-2);
        margin: 1rem 0;
        padding: 1rem 0;
        height: 8rem;
        display: flex;
        align-items: center;
        justify-content: center;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    h2 {
        color: var(--color-1);
        margin: 0.5rem 0;
        margin-top: 1.5rem;
        text-align: left;
        font-size: 1.5rem;
        color: var(--color-1);
        corner-shape: squircle;
        padding: 0.5rem 0;
        width: fit-content;
    }

    .attributes {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1rem;
        flex: 1;
    }

    .attr {
        width: 100%;
        color: var(--color-text);
        font-size: 0.8621rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        padding: 0 1rem;
        corner-shape: squircle;
        border-radius: 1rem;

        > h3 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            border-bottom: 1px solid var(--color-1);
            font-size: 1rem;
            height: 3rem;
            color: var(--color-1);
            text-align: left;

            > button {
                height: 2rem;
                width: 3rem;
                border: none;
                background: transparent;
                color: var(--color-1);

                &:hover {
                    background: rgb(206, 13, 13);
                    color: #fff;
                }
            }
        }

        > .body {
            padding: 1rem 0;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
    }

    select {
        padding: 0.75rem 1.5rem;
        border: none;
        outline: none;
        background: var(--color-1);
        color: var(--color-bg-2);
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 4px;

        > option {
            background: var(--color-bg-2);
            color: var(--color-text);
            font-size: 0.8rem;
            font-weight: 600;
        }
    }
</style>
