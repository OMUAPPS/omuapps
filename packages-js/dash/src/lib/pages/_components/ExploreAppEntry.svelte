<script lang="ts">
    import type { App } from '@omujs/omu';

    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { Button, Localized, Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { TAGS } from './category.js';
    interface Props {
        app: App;
    }

    let { app }: Props = $props();

    let alreadyAdded = $state(false);

    async function install() {
        const { accepted } = await omu.dashboard.installApp(app);
        if (!accepted) return;
        console.log(`App ${app.id.key()} added`);
        alreadyAdded = true;
    }

    async function launch() {
        await omu.dashboard.openApp(app);
    }

    omu.onReady(async () => {
        alreadyAdded = await omu.server.apps.has(app.id.key());
    });

    onMount(() => omu.server.apps.event.remove.listen(async () => {
        alreadyAdded = await omu.server.apps.has(app.id.key());
    }));

    let tags =
        $derived(app.metadata?.tags?.map((tag) => {
            const tagData = TAGS[tag];
            if (!tagData) {
                return {
                    id: tag,
                    data: null,
                };
            }
            return {
                id: tag,
                data: tagData,
            };
        }).sort((a) => -(a.id === 'underdevelopment')) || []);
</script>

<button class="entry" class:added={alreadyAdded}>
    {#if BROWSER && app.metadata?.image}
        <img src={omu.i18n.translate(app.metadata.image)} alt="" class="thumbnail" />
    {/if}
    <div class="thumbnail-tint"></div>
    <div class="overlay">
        <div class="info">
            {#if app.metadata}
                <div class="meta">
                    <span class="icon">
                        {#if app.metadata.icon}
                            {@const icon = omu.i18n.translate(app.metadata.icon)}
                            {#if icon.startsWith('ti-')}
                                <i class="ti {icon}"></i>
                            {:else}
                                <img src={icon} alt="" />
                            {/if}
                        {:else}
                            <i class="ti ti-box"></i>
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
                </div>
            {/if}
            <small class="tag-list">
                {#each tags || [] as { id, data } (id)}
                    <span class="tag" class:dev={id === 'underdevelopment'}>
                        {#if data}
                            <i class="ti ti-{data.icon}"></i>
                            <p><Localized text={data.name} /></p>
                            <Tooltip>
                                <Localized text={data.description} />
                            </Tooltip>
                        {:else}
                            <i class="ti ti-tag"></i>
                            {id}
                        {/if}
                    </span>
                {/each}
            </small>
        </div>
        {#if alreadyAdded}
            <Button onclick={() => omu.server.apps.remove(app)}>
                <Tooltip>
                    <span>{$t('general.delete')}</span>
                </Tooltip>
                <i class="ti ti-trash"></i>
            </Button>
            <Button onclick={launch}>
                <Tooltip>
                    このアプリを起動する
                </Tooltip>
                開く
                <i class="ti ti-player-play"></i>
            </Button>
        {:else}
            <Button onclick={install} primary>
                追加
                <i class="ti ti-plus"></i>
            </Button>
        {/if}
    </div>
</button>

<style lang="scss">
    .entry {
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
        border: none;
        outline: 1px solid var(--color-outline);
        outline-offset: -1px;
        box-shadow: 0 0.25rem 0rem 0px color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%);
        border-radius: 2px;
    }

    .entry:hover {
        outline: 1px solid var(--color-1);
        background: var(--color-bg-1);
        transform: translateX(1px);
        transition: all 0.0621s;
    }

    .thumbnail-tint {
        position: absolute;
        inset: 0;
    }

    .entry:hover {
        .thumbnail-tint {
            content: '';
            position: absolute;
            inset: 1px;
            background: var(--color-bg-1);
            opacity: 0.621;
        }
    }

    .overlay {
        position: relative;
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        justify-content: space-between;
        flex: 1;
    }

    .info {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        height: 100%;
    }

    .meta {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .thumbnail {
        position: absolute;
        inset: 1px;
        width: calc(100% - 2px);
        height: calc(100% - 2px);
        object-fit: cover;
        filter: blur(.0621rem) contrast(0.621) brightness(1.23621);
    }

    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-left: 0.25rem;
        margin-top: 0.25rem;
        margin-right: 0.5rem;
        width: 40px;
        height: 40px;

        > img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }

        > .ti {
            font-size: 1.25rem;
        }
    }

    .name {
        font-weight: bold;
        width: fit-content;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 1rem;
    }

    .description {
        font-weight: bold;
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 0.65rem;
        color: var(--color-text);
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-align: left;
    }

    .tag-list {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
        container-type: inline-size;
        width: 100%;
    }

    .tag {
        position: relative;
        padding: 0.25rem 0.5rem;
        display: flex;
        align-items: baseline;
        justify-content: center;
        padding-left: 0.75rem;
        z-index: 1;

        > i {
            font-size: 0.8rem;
            margin-right: 0.2rem;
        }

        &.dev {
            display: flex;
            align-items: baseline;
            justify-content: center;
            outline: 1px dashed var(--color-1);
            outline-offset: -1px;
            border-radius: 3px;
            overflow: hidden;
            margin-right: 0.25rem;
            padding-left: 0.5rem;

            &::before {
                position: absolute;
                z-index: -1;
                inset: 0;
                content: '';
                background: var(--color-2);
                clip-path: polygon(0 100%, 100% 100%, 100% 0%);
                opacity: 0.0621;
            }
        }

        &:not(.dev) {
            background: var(--color-bg-1);
        }
    }

    @container (max-width: 300px) {
        .tag {
            &:not(.dev) {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 1.75rem;
                height: 1.75rem;
                padding-left: 0.75rem;

                > p {
                    display: none;
                }
            }
        }
    }
</style>
