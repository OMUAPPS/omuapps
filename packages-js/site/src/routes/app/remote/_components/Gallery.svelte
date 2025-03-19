<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { ButtonMini, Combobox, FileDrop, Tooltip } from '@omujs/ui';
    import type { RemoteApp, Resource } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { resources, config } = remote;
    
    let search = '';
    type Sort = {
        order: 'asc' | 'desc',
        key: 'addedAt' | 'filename' | 'size',
    };
    let sort: Sort = {
        order: 'desc',
        key: 'addedAt',
    };

    function compare(sort: Sort) {
        return ([_a , a]: [string, Resource], [_b ,b]: [string, Resource]) => {
            const aVal = a[sort.key] || 0;
            const bVal = b[sort.key] || 0;
            if (aVal === bVal) {
                return 0;
            }
            if (sort.order === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        };
    }
</script>

<div class="header">
    <Combobox options={{
        addedAt: {
            label: '追加日',
            value: 'addedAt',
        },
        filename: {
            label: 'ファイル名',
            value: 'filename',
        },
        size: {
            label: 'サイズ',
            value: 'size',
        },
    }} bind:value={sort.key} />
    <Combobox options={{
        asc: {
            label: '昇順',
            value: 'asc',
        },
        desc: {
            label: '降順',
            value: 'desc',
        },
    }} bind:value={sort.order} />
    <input type="text" placeholder="検索..." bind:value={search} />
    <FileDrop primary handle={async (files) => {
        remote.upload(...files);
    }} multiple>
        画像を追加
        <i class="ti ti-upload"></i>
    </FileDrop>
</div>
<ul>
    {#each Object.entries($resources.resources)
        .toReversed()
        .filter((it) => it[1].filename?.includes(search))
        .toSorted(compare(sort)) as [id, resource] (id)}
        {@const active = $config.show?.asset === resource.asset}
        <li>
            <span class="info">
                <Tooltip>
                    <div class="tooltip">
                        {#if resource.filename}
                            <p>
                                <small>
                                    ファイル名
                                </small>
                                {resource.filename}
                            </p>
                        {/if}
                        {#if resource.addedAt}
                            <p>
                                <small>
                                    追加日
                                </small>
                                {new Date(resource.addedAt).toLocaleString()}
                            </p>
                        {/if}
                        {#if resource.size}
                            <p>
                                <small>
                                    サイズ
                                </small>
                                {resource.size}
                            </p>
                        {/if}
                    </div>
                </Tooltip>
                <input type="text" value={resource.filename} on:blur={(e) => {
                    $resources.resources[id].filename = e.currentTarget.value;
                }} />
                <ButtonMini on:click={() => {
                    remote.deleteResource(id);
                }}>
                    <i class="ti ti-trash"></i>
                </ButtonMini>
            </span>
            <button class="asset" class:active on:click={() => {
                if (active) {
                    $config.show = null;
                    return;
                }
                $config.show = {
                    type: 'image',
                    asset: resource.asset,
                }
            }}>
                <Tooltip>
                    {active ? 'クリックで解除' : 'クリックで選択'}
                </Tooltip>
                <div class="status">
                    <i class="ti ti-check"></i>
                </div>
                <img src={omu.assets.url(resource.asset)} alt="">
            </button>
        </li>
    {/each}
</ul>

<style lang="scss">
    .header {
        position: sticky;
        top: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--color-outline);
        padding: 1rem 2rem;
        height: 4rem;
        gap: 1rem;
        z-index: 1;
        background: var(--color-bg-1);

        > input {
            background: transparent;
            color: var(--color-text);
            font-size: 0.8rem;
            font-weight: 600;
            border: none;
            padding: 0.5rem 0;
            padding-bottom: 0.25rem;
            flex: 1;

            &:focus {
                outline: none;
                border-bottom: 1px solid var(--color-1);
                transition: padding 0.01621s;
            }
        }
    }

    .asset {
        position: relative;
        display: flex;
        flex-direction: column;
        height: fit-content;
        background: var(--color-bg-2);
        color: var(--color-text);
        font-size: 0.8rem;
        padding: 0.75rem;
        border: none;
        outline: 0px solid var(--color-1);
        outline-offset: -1px;
        overflow: visible;

        &:hover {
            cursor: pointer;
            outline-width: 2px;
            outline-offset: -2px;
            outline-color: var(--color-outline);
            transition: outline-offset 0.01621s;
        }

        &:active {
            outline-offset: -4px;
            transition: outline-offset 0.02621s;
            outline-color: var(--color-1);

            &.active {
                outline-offset: -4px;
            }
        }

        &.active {
            outline-width: 2px;
            outline-offset: -3px;
            outline-color: var(--color-1);

            > .status {
                display: block;
                background: var(--color-1);
                position: absolute;
                top: 0;
                left: 0;
                width: 1.5rem;
                height: 1.5rem;
                display: flex;
                justify-content: center;
                align-items: center;
                color: var(--color-bg-2);
                transform: translate(-30%, -30%);
                border-radius: 50%;
            }
        }

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        > .status {
            display: none;
        }
    }

    .info {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0 2px;
        gap: 0.5rem;

        > input {
            background: transparent;
            color: var(--color-text);
            font-size: 0.8rem;
            font-weight: 600;
            border: none;
            padding: 0.5rem 0;
            padding-bottom: 0.25rem;
            width: 100%;

            &:focus {
                outline: none;
                border-bottom: 1px solid var(--color-1);
                transition: padding 0.01621s;
            }
        }
    }

    .tooltip {
        > p > small {
            color: #ddd;
            font-size: 0.621rem;
            font-weight: 600;
            margin-right: 0.25rem;
        }
    }

    ul {
        list-style: none;
        padding: 1rem 2rem;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: 1rem;
    }
</style>
