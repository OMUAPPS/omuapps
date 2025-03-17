<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { ButtonMini, FileDrop, Tooltip } from '@omujs/ui';
    import type { RemoteApp } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { resources, config } = remote;
    
    let search = '';
</script>

<div class="header">
    <input type="text" placeholder="検索..." bind:value={search} />
    <FileDrop primary handle={async (files) => {
        remote.upload(...files);
    }} multiple>
        画像を追加
        <i class="ti ti-upload"></i>
    </FileDrop>
</div>
<ul>
    {#each Object.entries($resources.resources).toReversed().filter((it) => it[1].filename?.includes(search)) as [id, resource] (id)}
        {@const active = $config.show?.asset === resource.asset}
        <li>
            <span class="info">
                <input type="text" bind:value={resource.filename} />
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
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--color-1);
        padding: 1rem 0;
        margin: 0 2rem;
        height: 4rem;
        gap: 1rem;

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
        overflow: visible;

        &:hover {
            cursor: pointer;
            transform: translateY(-2px);
            transition: transform 0.04621s ease;
        }

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        > .status {
            display: none;
        }

        &.active {
            outline: 1px solid var(--color-1);
            outline-offset: -5px;

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

    ul {
        list-style: none;
        padding: 1rem 2rem;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: 1rem;
    }
</style>
