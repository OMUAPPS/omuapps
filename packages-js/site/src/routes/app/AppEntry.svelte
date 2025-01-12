<script lang="ts">
    import type { App } from '@omujs/omu';
    import { FlexColWrapper, FlexRowWrapper, Localized, Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { omu } from '../client.js';
    import { appTable } from './apps.js';
    import { REGISTRIES } from './category.js';
    export let app: App;

    let alreadyAdded = false;

    async function install() {
        const { accepted } = await omu.dashboard.installApp(app);
        if (!accepted) return;
        await omu.dashboard.openApp(app);
        alreadyAdded = true;
    }

    async function launch() {
        await omu.dashboard.openApp(app);
    }

    omu.onReady(async () => {
        alreadyAdded = await appTable.has(app.id.key());
        console.log(`App ${app.id.key()} already added: ${alreadyAdded}`);
    });

    $: tags =
        app.metadata?.tags?.map((tag) => {
            const tagData = REGISTRIES[tag];
            if (tagData) {
                return tagData;
            }
            return tag;
        }) || [];
</script>

<article class:added={alreadyAdded}>
    {#if BROWSER && app.metadata?.image}
        <img src={omu.i18n.translate(app.metadata.image)} alt="" class="thumbnail" />
    {/if}
    <div class="overlay">
        <FlexRowWrapper alignItems="start" widthFull heightFull between>
            <FlexColWrapper heightFull between>
                {#if app.metadata}
                    <FlexRowWrapper alignItems="center">
                        <span class="icon">
                            {#if BROWSER && app.metadata.icon}
                                {@const icon = omu.i18n.translate(app.metadata.icon)}
                                {#if icon.startsWith('ti-')}
                                    <i class="ti {icon}" />
                                {:else}
                                    <img src={icon} alt="" />
                                {/if}
                            {:else}
                                <i class="ti ti-app"></i>
                            {/if}
                        </span>
                        <span>
                            <p class="name">
                                <Localized text={app.metadata.name} />
                            </p>
                            <small class="description">
                                <Localized text={app.metadata.description} />
                            </small>
                        </span>
                    </FlexRowWrapper>
                {/if}
                <small class="tag-list">
                    {#each tags || [] as tag, i (i)}
                        <span class="tag">
                            {#if typeof tag === 'string'}
                                <i class="ti ti-tag"></i>
                                {tag}
                            {:else}
                                <i class="ti ti-{tag.icon}" />
                                <Localized text={tag.name} />
                            {/if}
                        </span>
                    {/each}
                </small>
            </FlexColWrapper>
            <FlexRowWrapper>
                <button on:click={() => (alreadyAdded ? launch() : install())} class:active={alreadyAdded}>
                    <Tooltip>
                        {alreadyAdded ? '管理画面から起動する' : '管理画面に追加する'}
                    </Tooltip>
                    {alreadyAdded ? '開く' : '追加'}
                    <i class={alreadyAdded ? 'ti ti-player-play' : 'ti ti-download'} />
                </button>
            </FlexRowWrapper>
        </FlexRowWrapper>
    </div>
</article>

<style lang="scss">
    article {
        position: relative;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
        display: flex;
        width: 100%;
        height: 8rem;
        padding: 1rem;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        outline-offset: -1px;
        box-shadow: 0 0.25rem 0rem 0px color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%);
        border-radius: 2px;

        &:hover {
            transform: translateX(1px);
            transition: all 0.0621s;
        }
    }

    .thumbnail {
        position: absolute;
        inset: 1px;
        width: calc(100% - 2px);
        height: calc(100% - 2px);
        object-fit: cover;
        filter: blur(.0621rem) contrast(0.621) brightness(1.23621);
    }

    .overlay {
        position: relative;
        height: 100%;
    }

    article:hover {
        outline: 1px solid var(--color-1);
        background: var(--color-bg-1);
    }

    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-left: 0.25rem;
        margin-top: 0.25rem;
        margin-right: 0.5rem;
        font-size: 1.25rem;
        width: 40px;
        height: 40px;

        img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
    }

    .name {
        font-weight: bold;
        width: fit-content;
    }

    .description {
        font-weight: bold;
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 0.65rem;
        color: var(--color-text);
    }

    .tag-list {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
    }

    .tag {
        padding: 0.25rem 0.5rem;
        background: var(--color-bg-1);

        > i {
            font-size: 0.8rem;
            margin-right: 0.2rem;
        }
    }

    button {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin-left: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        color: var(--color-bg-1);
        background: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        border-radius: 3px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;

        &.active {
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -2px;
        }

        &:hover {
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -2px;
        }
    }
</style>
