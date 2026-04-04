<script lang="ts">
    import { Button, Textbox, Tooltip } from '@omujs/ui';
    import EditTransform from '../../common/EditTransform.svelte';
    import type { Game } from '../../core/game';
    import type { AttributeKey } from '../../item/attribute';
    import { preview, type SceneFactoryData } from './factory';

    interface Props {
        scene: SceneFactoryData;
        game: Game;
    }

    let { game, scene }: Props = $props();

    const itemStore = $derived(
        scene.itemId ? game.item.items.getStore(scene.itemId) : undefined,
    );

    let lastAttributeString = JSON.stringify($itemStore?.attrs);

    $effect.pre(() => {
        if (!$itemStore) return;
        const currentAttributeString = JSON.stringify($itemStore.attrs);
        if (lastAttributeString !== currentAttributeString) {
            $itemStore.update++;
        }
        lastAttributeString = currentAttributeString;
    });

    function deleteAttribute(key: AttributeKey) {
        if (!$itemStore) return;
        delete $itemStore.attrs[key];
    }

    function addAttribute(event: Event & { currentTarget: HTMLSelectElement }) {
        const key = event.currentTarget.value as AttributeKey;
        const attribute = game.attribute.values[key];
        if (!attribute || !$itemStore) return;
        $itemStore.attrs[key] = attribute.create() as never;
    }

    function goBack() {
        game.startTransition({ type: 'kitchen' });
    }

</script>

<main>
    {#if game.side === 'client'}
        <div class="menu omu-scroll">
            <Button onclick={goBack} primary>
                <i class="ti ti-chevron-left"></i>
                もどる
            </Button>
            <h1>工場</h1>

            {#if scene && $itemStore}
                {#if $preview}
                    <div class="preview">
                        <img src={$preview.url} alt="">
                    </div>
                {/if}
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
                        <option value="">追加</option>
                        {#each Object.entries(game.attribute.values) as [key, attribute] (key)}
                            {@const attr = $itemStore.attrs[key as AttributeKey]}
                            {#if !attr}
                                <option value={key}>{attribute.name}</option>
                            {/if}
                        {/each}
                    </select>
                </div>
            {:else}
                <br>
                <small>アイテムを選択するか追加して編集します</small>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
    }

    .menu {
        width: 24rem;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        background: var(--color-bg-1);
        box-shadow: 0 0 1rem rgba($color: #000000, $alpha: 0.3);
    }

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

    h1,
    h2 {
        color: var(--color-1);
        margin: 0.5rem 0;
        margin-top: 1rem;
        text-align: left;
        font-size: 1.5rem;
        color: var(--color-1);
        corner-shape: squircle;
        padding: 0.5rem 0;
        width: fit-content;
    }

    h1 {
        border-bottom: 2px solid var(--color-1);
        width: 100%;
        margin-bottom: 1rem;
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
        padding: 0.5rem 1rem;
    }
</style>
