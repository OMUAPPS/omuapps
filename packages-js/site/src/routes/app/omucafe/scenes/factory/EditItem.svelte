<script lang="ts">
    import { Textbox, Tooltip } from '@omujs/ui';
    import EditTransform from '../../common/EditTransform.svelte';
    import { Game } from '../../core/game';
    import type { AttributeKey } from '../../item/attribute';
    import { validateItem } from '../../item/item';
    import EditItemJson from './EditItemJson.svelte';
    import { attributeClipboard, preview } from './factory';

    interface Props {
        id: string;
    }

    let { id }: Props = $props();

    const game = Game.getInstance();

    const itemStore = $derived(game.item.items.getStore(id));

    if ($itemStore) {
        const result = validateItem($itemStore);
        if (result.type === 'valid') {
            $itemStore = result.value;
        }
    }

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
        if (!$itemStore) return;
        const key = event.currentTarget.value as AttributeKey | 'clipboard';
        if (key === 'clipboard') {
            if ($attributeClipboard) {
                // @ts-expect-error Union vs Intersection
                $itemStore.attrs[$attributeClipboard.type] = $attributeClipboard.data;
            }
            return;
        }
        const attribute = game.attribute.values[key];
        if (!attribute) return;
        $itemStore.attrs[key] = attribute.create() as never;
    }
</script>

{#if $itemStore}
    <div class="item-header">
        <div class="preview">
            {#if $preview[id]}
                <img src={$preview[id].url} alt="">
            {:else}
                <i class="ti ti-package" aria-hidden="true"></i>
            {/if}
        </div>
        <label class="item-name">
            アイテム名
            <Textbox bind:value={$itemStore.name} />
        </label>
    </div>
    <details name="item-settings">
        <summary>位置・大きさ・回転</summary>
        <div class="transform-fields">
            <EditTransform bind:transform={$itemStore.transform} />
        </div>
    </details>
    <h2>
        属性
        <select aria-label="属性を追加" onchange={addAttribute}>
            <option value="">
                追加
            </option>
            {#if $attributeClipboard}
                <option value="clipboard">
                    ペースト
                </option>
            {/if}
            {#each Object.entries(game.attribute.values) as [key, attribute] (key)}
                {@const attr = $itemStore.attrs[key as AttributeKey]}
                {#if !attr}
                    <option value={key}>{attribute.name}</option>
                {/if}
            {/each}
        </select>
    </h2>
    <div class="attributes">
        {#each Object.entries(game.attribute.values) as [key, attribute] (key)}
            {@const attr = $itemStore.attrs[key as AttributeKey]}
            {#if attr}
                <details class="attr" name="item-settings">
                    <summary>{attribute.name}</summary>

                    <div class="body">
                        <attribute.editor
                            bind:attr={$itemStore.attrs[key as AttributeKey] as never}
                        />
                    </div>
                    <div class="attribute-actions">
                        <button onclick={() => {
                            $attributeClipboard = {
                                type: key as AttributeKey,
                                data: attr,
                            };
                        }}>
                            <Tooltip>この属性の設定をコピー</Tooltip>
                            <i class="ti ti-copy"></i> コピー
                        </button>
                        {#if key !== 'image'}
                            <button class="remove" onclick={() => deleteAttribute(key as AttributeKey)}>
                                <Tooltip>この属性を削除</Tooltip>
                                <i class="ti ti-x"></i> 削除
                            </button>
                        {/if}
                    </div>
                </details>
            {/if}
        {/each}
    </div>
    <details name="item-settings">
        <summary>詳細編集（JSON）</summary>
        <EditItemJson bind:item={$itemStore} />
    </details>
{/if}

<style lang="scss">
    .item-header {
        display: grid;
        grid-template-columns: 5rem minmax(0, 1fr);
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .preview {
        display: grid;
        place-items: center;
        width: 5rem;
        height: 5rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        background: var(--color-bg-2);
        overflow: hidden;
        img { width: 100%; height: 100%; object-fit: contain; }
        i { font-size: 2rem; color: var(--color-1); }
    }
    .item-name { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; font-size: 0.8rem; }
    h2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 1.25rem 0 0.5rem;
        font-size: 0.9rem;
        color: var(--color-text);
    }
    details {
        margin-top: 0.5rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        background: var(--color-bg-2);
        overflow: hidden;
        min-width: 0;
    }
    summary {
        padding: 0.9rem 1rem;
        color: var(--color-1);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }
    details[open] > summary { border-bottom: 1px solid var(--color-outline); }
    summary:focus-visible, button:focus-visible, select:focus-visible {
        outline: 2px solid var(--color-1);
        outline-offset: -2px;
    }
    .attributes { display: flex; flex-direction: column; gap: 0.5rem; }
    .attr { margin: 0; }
    .body, .transform-fields {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 0.9rem;
        overflow-x: auto;
    }
    .body :global(label) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        line-height: 1.5;
    }
    .transform-fields :global(.edit) { flex-wrap: wrap; justify-content: center; }
    .transform-fields :global(.inspector) { flex: 1; }
    .transform-fields :global(.inspector input) { box-sizing: border-box; width: 100%; padding: 0.4rem; }
    .attribute-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-top: 1px solid var(--color-outline);

        button {
            border: none;
            border-radius: 0.25rem;
            padding: 0.5rem;
            background: transparent;
            color: var(--color-text);
            font: inherit;
            font-size: 0.8rem;
            cursor: pointer;
            &:hover { background: var(--color-bg-1); }
        }
        .remove { color: #a33131; }
    }
    select {
        max-width: 70%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.4rem;
        background: var(--color-bg-2);
        color: var(--color-text);
        font-size: 0.8rem;
    }
</style>
