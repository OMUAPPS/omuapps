<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { App } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import { loadedIds, registerPage, type Page } from './page.js';
    import AppPage from './pages/AppPage.svelte';
    import { currentPage, menuOpen } from './settings.js';

    export let entry: App;
    export let selected: boolean = false;

    const metadata = entry.metadata;
    const name = metadata?.name ? omu.i18n.translate(metadata?.name) : entry.id.key();
    const description = metadata?.description
        ? omu.i18n.translate(metadata?.description)
        : 'No description';
    const icon = metadata?.icon ? omu.i18n.translate(metadata?.icon) : 'No icon';
    const image = metadata?.image ? omu.i18n.translate(metadata?.image) : null;

    const appPage = registerPage({
        id: `app-${entry.id.key()}`,
        async open() {
            return {
                component: AppPage,
                props: {
                    app: entry,
                },
            } as Page<unknown>;
        },
    });

    function handleClick() {
        $currentPage = appPage.id;
    }

    $: loaded = $loadedIds.includes(appPage.id);
    $: active = $currentPage === appPage.id;
</script>

<button class="app" class:active class:selected on:click={handleClick}>
    <Tooltip>
        <div class="tooltip">
            {#if $menuOpen}
                {description}
                {#if loaded}
                    <h3>
                        <span class="loaded">
                            読み込み済み
                            <i class="ti ti-check" />
                        </span>
                    </h3>
                {/if}
            {:else}
                <h3>
                    {name}
                    {#if loaded}
                        <span class="loaded">
                            読み込み済み
                            <i class="ti ti-check" />
                        </span>
                    {/if}
                </h3>
                <small>{description}</small>
            {/if}
        </div>
    </Tooltip>
    {#if image}
        <img src={image} alt="" class="image" />
    {/if}
    {#if $menuOpen}
        <div class="info">
            <span class="icon">
                {#if icon.startsWith('ti-')}
                    <i class="ti {icon}"></i>
                {:else}
                    <img src={icon} alt={name} />
                {/if}
            </span>
            <p class="name">
                {name}
            </p>
            <div class="open">
                <i class="ti ti-chevron-right" />
            </div>
        </div>
    {:else}
        <div class="info">
            <span class="icon">
                {#if icon.startsWith('ti-')}
                    <i class="ti {icon}"></i>
                {:else}
                    <img src={icon} alt={name} />
                {/if}
            </span>
        </div>
    {/if}
</button>

<style lang="scss">
    .app {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        background: var(--color-bg-2);
        border: none;
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        height: 4rem;

        &.active {
            background: var(--color-bg-1);
            border-right: 2px solid var(--color-1);
            transition: background 0.0621s;
        }

        &.selected,
        &:focus,
        &:hover {
            transition: background 0.0621s;

            > .info {
                margin: 0.1rem;
                transition: margin 0.0621s;

                > .open {
                    visibility: visible;
                    margin-right: 0rem;
                    transition: margin 0.0621s;
                }
            }
        }

        .tooltip {
            display: flex;
            flex-direction: column;
            align-items: start;
            text-wrap: wrap;
            text-align: start;
            padding: 0.1rem;
            gap: 0.5rem;

            > h3 {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--color-text-1);
                width: 100%;

                > .loaded {
                    font-size: 0.6rem;
                    padding: 0.1rem 0.25rem;
                    background: var(--color-bg-1);
                    color: var(--color-1);
                }
            }

            > small {
                font-size: 0.621rem;
                color: var(--color-text-2);
            }
        }

        > .image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.5;
        }

        > .info {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 0.5rem;
            width: 100%;
            color: var(--color-1);

            > .icon {
                display: flex;
                justify-content: center;
                align-items: center;
                min-width: 2rem;
                min-height: 2rem;
                width: 2rem;
                height: 2rem;
                margin-right: 0.25rem;
                background: var(--color-bg-3);

                > img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                > .ti {
                    font-size: 1.25rem;
                }
            }

            > .name {
                margin-left: 0.25rem;
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-1);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            > .open {
                visibility: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: auto;
                margin-right: 0.1rem;
                min-width: 2rem;
                height: 2rem;
                color: var(--color-1);
                background: none;
                border: none;
            }
        }
    }
</style>
