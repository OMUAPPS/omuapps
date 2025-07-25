<script lang="ts">
    import { formatBytes } from '$lib/helper.js';
    import type { Omu } from '@omujs/omu';
    import { Button, ButtonMini, Combobox, FileDrop, Spinner, Tooltip } from '@omujs/ui';
    import type { AlbumResource, ImageResource, RemoteApp, Resource } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { resources, config } = remote;
    
    let selectedId: string | null = null;
    let multipleSelectedIds: string[] = [];
    $: multiple = multipleSelectedIds.length > 1;
    let activeClicked = false;
    let lastClickedTime = 0;
    let album: AlbumResource | null = null;
    let selected: ImageResource | null = null;

    function select(shiftKey: boolean, id: string, type: 'click' | 'drag') {
        const active = id === $config.show?.id;
        const resource = $resources.resources[id];
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
            if (elapsed < 1000 / 5 && sameResource) {
                if (resource.type === 'album') {
                    album = resource;
                    return;
                } else if (resource.type === 'image') {
                    selected = resource;
                } else {
                    throw new Error(`Unknown resource type: ${resource}`);
                }
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
        return ([, a]: [string, Resource], [, b]: [string, Resource]) => {
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

    $: visibleItems = [
        ...Object.entries($resources.resources).filter((it) => it[1].type === 'album')
            .filter((it) => it[1].filename?.includes(search))
            .filter(album ? (it) => album?.assets.includes(it[0]) : () => true)
            .toSorted(compare(sort)),
        ...Object.entries($resources.resources).filter((it) => it[1].type !== 'album')
            .filter((it) => it[1].filename?.includes(search))
            .filter(album ? (it) => album?.assets.includes(it[0]) : () => true)
            .toSorted(compare(sort)),
    ];
    $: {
        for (const item of visibleItems) {
            remote.assetUri(item[0]);
        }
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
    }} multiple accept="image/*">
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
    {#each visibleItems as [id, resource] (id)}
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
                on:touchend={(event) => {
                    event.preventDefault();
                    select(false, id, 'click');
                }}
                on:click={(event) => {
                    select(event.shiftKey, id, 'click');
                }}
                on:mousemove={(event) => {
                    if (event.buttons !== 1) return;
                    select(event.shiftKey, id, 'drag');
                }}
                on:mousedown={() => {
                    activeClicked = multipleSelectedIds.includes(id);
                }}
            >
                <div class="status">
                    <i class="ti ti-check"></i>
                </div>
                {#if resource.type === 'image'}
                    {#await remote.assetUri(id)}
                        <Spinner />
                    {:then src}
                        <img src={src} alt="">
                    {:catch}
                        <i class="ti ti-alert"></i>
                    {/await}
                {:else}
                    <div class="album">
                        {#each resource.assets as asset (asset)}
                            {#await remote.assetUri(asset)}
                                <Spinner />
                            {:then src}
                                <img src={src} alt="">
                            {/await}
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
            const date = new Date();
            remote.createAlbum(images, `${date.toLocaleDateString()}のアルバム`);
            multipleSelectedIds = [];
        }} primary>
            アルバムを作成
        </Button>
    </div>
{/if}
<svelte:window on:keydown={(event) => {
    if (event.key === 'Escape') {
        selected = null;
    }
}} />
{#if selected}
    <button
        class="preview"
        on:click={() => {
            selected = null;
        }}
    >
        <div class="image">
            {#await omu.assets.download(selected.asset).then(async ({buffer}) => {
                const blob = new Blob([buffer]);
                const uri = URL.createObjectURL(blob);
                return uri;
            })}
                <Spinner />
            {:then image}
                <img src={image} alt="">
            {/await}
        </div>
        <div class="info">
            {#if selected.filename}
                <p>
                    {selected.filename}
                </p>
            {/if}
            <small>
                {#if selected.addedAt}
                    <span>
                        {new Date(selected.addedAt).toLocaleString()}
                    </span>
                {/if}
                {#if selected.size}
                    <span>
                        {formatBytes(selected.size)}
                    </span>
                {/if}
            </small>
        </div>
    </button>
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

    .preview {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-1);
        z-index: 2;
        border: 0;
        outline: 0;
        cursor: pointer;

        > .info {
            margin-bottom: 2rem;
            color: var(--color-1);
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;

            > small {
                color: var(--color-text);
                font-size: 0.621rem;
                font-weight: 600;
            }
        }

        > .image {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            flex: 1;
            color: var(--color-1);

            > img {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 1rem 0;
                cursor: initial;
            }
        }
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
                top: -0.25rem;
                right: -1rem;
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
            animation: fade-in 0.1621s;
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
                animation: fade-in 0.1621s;
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

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
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
