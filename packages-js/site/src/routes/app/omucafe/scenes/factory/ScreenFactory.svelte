<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { Game } from '../../core/game';
    import type { AttributeKey } from '../../item/attribute';
    import type { SceneFactoryData } from './factory';

    interface Props {
        scene: SceneFactoryData;
        game: Game;
    }

    let { game, scene }: Props = $props();

    let lastAttributeString = JSON.stringify(scene.item?.attrs);

    const { attributeRegistry } = game.itemSystem;

    $effect.pre(() => {
        const attributeString = JSON.stringify(scene.item?.attrs);
        if (lastAttributeString !== attributeString) {
            scene.item!.update++;
        }
        lastAttributeString = attributeString;
    });
</script>

<main>
    <div class="menu">
        <h1>工場</h1>
        <button onclick={() => {
            game.states.scene.store.set({
                type: 'kitchen',
            });
        }}>
            もどる
        </button>
        {#if scene && scene.item}
            {@const { item } = scene}
            <h2>属性</h2>
            <div class="attributes">
                {#each Object.entries(attributeRegistry.values) as [key, attribute] (key)}
                    {@const attr = item.attrs[key as AttributeKey]}
                    {#if attr}
                        <div class="attr">
                            <h3>
                                {attribute.name}
                                <button onclick={() => {
                                    delete item.attrs[key as AttributeKey];
                                }}>
                                    <Tooltip>
                                        削除
                                    </Tooltip>
                                    <i class="ti ti-x"></i>
                                </button>
                            </h3>
                            <div class="body">
                                <attribute.editor bind:attr={item.attrs[key as AttributeKey] as never} />
                            </div>
                        </div>
                    {/if}
                {/each}
                <select
                    onchange={(event) => {
                        const key = event.currentTarget.value;
                        const attribute = attributeRegistry.values[key as AttributeKey];
                        if (!attribute) return;
                        item.attrs[key as AttributeKey] = attribute.create() as never;
                    }}
                >
                    <option value="">
                        追加
                    </option>
                    {#each Object.entries(attributeRegistry.values) as [key, attribute] (key)}
                        {@const attr = item.attrs[key as AttributeKey]}
                        {#if !attr}
                            <option value={key}>
                                {attribute.name}
                            </option>
                        {/if}
                    {/each}
                </select>
            </div>
        {/if}
    </div>
    <pre>{JSON.stringify(scene, null, 4)}
    </pre>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
    }

    .menu {
        width: 20rem;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        padding: 0 1rem;
    }

    h1,
    h2 {
        color: var(--color-1);
        font-size: 1.3rem;
        border-bottom: 1px solid;
        padding: 0.5rem 1rem;
        margin-bottom: 1rem;
        text-align: left;
    }

    .attributes {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        align-items: flex-end;
        gap: 1rem;
        flex: 1;
    }

    .attr {
        width: 100%;
        margin-bottom: 0.5rem;
        outline: 1px solid var(--color-outline);
        background: var(--color-bg-2);

        > h3 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            border-bottom: 1px solid var(--color-outline);
            background: var(--color-bg-1);
            text-transform: capitalize;
            font-size: 1rem;
            padding-left: 1rem;
            height: 3rem;
            color: var(--color-1);
            text-align: left;

            > button {
                height: 100%;
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
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
    }

    pre {
        height: 20rem;
        overflow: auto;
    }

    select {
        padding: 0.5rem 1rem;
    }
</style>
