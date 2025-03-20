<script lang="ts">
    import { formatBytes } from '$lib/helper.js';
    import type { Omu } from '@omujs/omu';
    import { Button, ButtonMini, Combobox, FileDrop, Tooltip } from '@omujs/ui';
    import type { AlbumResource, RemoteApp, Resource } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { resources, config } = remote;
    
    let selectedId: string | null = null;
    let multipleSelectedIds: string[] = [];
    $: multiple = multipleSelectedIds.length > 1;
    let activeClicked = false;
    let lastClickedTime = 0;
    let album: AlbumResource | null = null;

    function select(event: MouseEvent, id: string, type: 'click' | 'drag') {
        const active = id === $config.show?.id;
        const resource = $resources.resources[id];
        const { shiftKey } = event;
        const multiple = shiftKey;
        if (multiple) {
            if (activeClicked) {
                multipleSelectedIds = multipleSelectedIds.filter((it) => it !== id);
            } else if (!multipleSelectedIds.includes(id)) {
                multipleSelectedIds = [...multipleSelectedIds, id];
            }
        } else if (type === 'click') {
            const elapsed = performance.now() - lastClickedTime;
            const sameResource = multipleSelectedIds.length === 1 && multipleSelectedIds[0] === id;
            if (elapsed < 1000 && sameResource && resource.type === 'album') {
                album = resource;
                return;
            }
            lastClickedTime = performance.now();
            multipleSelectedIds = [id];
            if (active) {
                $config.show = null;
                return;
            }
            $config.show = {
                type: 'resource',
                id,
            }
        }
    }

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
    <input type="text" placeholder="検索..." bind:value={search} />
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
    <FileDrop primary handle={async (files) => {
        remote.upload(...files);
    }} multiple>
        画像を追加
        <i class="ti ti-upload"></i>
    </FileDrop>
</div>
{#if album}
    <div class="header">
        <Button onclick={() => {
            album = null;
        }} primary>
            閉じる
        </Button>
        <h2>{album.filename}</h2>
        <small>
            {album.assets.length} 件
        </small>
    </div>
{/if}
<div class="gallery">
    <!-- {#each Object.entries($resources.resources)
        .toReversed()
        .filter((it) => it[1].filename?.includes(search))
        .filter(album ? (it) => album?.assets.includes(it[0]) : () => true)
        .toSorted(compare(sort)) as [id, resource] (id)} -->
    {#each [
        ...Object.entries($resources.resources).filter((it) => it[1].type === 'album')
            .filter((it) => it[1].filename?.includes(search))
            .filter(album ? (it) => album?.assets.includes(it[0]) : () => true)
            .toSorted(compare(sort)),
        ...Object.entries($resources.resources).filter((it) => it[1].type !== 'album')
            .filter((it) => it[1].filename?.includes(search))
            .filter(album ? (it) => album?.assets.includes(it[0]) : () => true)
            .toSorted(compare(sort)),
    ] as [id, resource] (id)}
        {@const active = $config.show?.id === id || (multiple && multipleSelectedIds.includes(id))}
        {@const selected = selectedId === id}
        <div
            on:focus={() => {
                selectedId = id;
            }}
            on:mouseover={() => {
                selectedId = id;
            }}
            on:mouseleave={() => {
                selectedId = null;
            }}
            role="button"
            tabindex="0"
        >
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
                        {#if resource.type === 'image'}
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
                                    {formatBytes(resource.size)}
                                </p>
                            {/if}
                        {/if}
                    </div>
                </Tooltip>
                {#if resource.type === 'album'}
                    <i class="ti ti-library-photo"></i>
                {/if}
                <input type="text" value={resource.filename} on:blur={(e) => {
                    $resources.resources[id].filename = e.currentTarget.value;
                }} />
                {#if selected}
                    <ButtonMini on:click={() => {
                        remote.deleteResource(id);
                    }}>
                        <i class="ti ti-trash"></i>
                    </ButtonMini>
                {/if}
            </span>
            <button class="asset" class:active class:album={resource.type === 'album'}
                on:click={(event) => {
                    select(event, id, 'click');
                }}
                on:mousemove={(event) => {
                    if (event.buttons !== 1) return;
                    select(event, id, 'drag');
                }}
                on:mousedown={() => {
                    activeClicked = multipleSelectedIds.includes(id);
                }}
            >
                <div class="status">
                    <i class="ti ti-check"></i>
                </div>
                {#if resource.type === 'image'}
                    <img src={omu.assets.url(resource.asset)} alt="">
                {:else}
                    <div class="album">
                        {#each resource.assets as asset}
                            <img src={omu.assets.url(asset)} alt="">
                        {/each}
                        <i class="ti ti-library-photo"></i>
                    </div>
                {/if}
            </button>
        </div>
    {/each}
</div>
{#if multiple}
    <div class="actions">
        <Button onclick={() => {
            remote.deleteResource(...multipleSelectedIds);
            multipleSelectedIds = [];
        }} primary>
            <i class="ti ti-trash"></i>
        </Button>
        <Button onclick={() => {
            const images = multipleSelectedIds.filter((id) => $resources.resources[id].type === 'image');
            remote.createAlbum(images, '新しいアルバム');
            multipleSelectedIds = [];
        }} primary>
            アルバムを作成
        </Button>
    </div>
{/if}

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

    .actions {
        position: sticky;
        bottom: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid var(--color-outline);
        padding: 1rem 2rem;
        height: 4rem;
        gap: 1rem;
        z-index: 1;
        background: var(--color-bg-1);
    }

    .gallery {
        list-style: none;
        padding: 1rem 2rem;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: 1rem;
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
        user-select: none;
        width: 100%;

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
                top: 1.25rem;
                left: -0.15rem;
                width: 1.5rem;
                height: 1.5rem;
                display: flex;
                justify-content: center;
                align-items: center;
                color: var(--color-bg-2);
                transform: translate(-30%, -30%);
                border-radius: 50%;
                outline: 2px solid var(--color-bg-2);
            }
        }


        &.album {
            filter: drop-shadow(2px 2px 0rem var(--color-bg-1)) drop-shadow(2px 2px 0rem var(--color-outline));
        }

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
        }

        .album {
            position: relative;
            width: 100%;
            height: 8rem;
            pointer-events: none;

            > img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                user-select: none;
            }

            > i {
                position: absolute;
                bottom: -0.5rem;
                right: -0.5rem;
                width: 3rem;
                height: 3rem;
                border-radius: 0.75rem 0 0 0;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5rem;
                color: var(--color-1);
                background: var(--color-bg-2);
                user-select: none;
            }
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
        height: 2rem;
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
</style>
