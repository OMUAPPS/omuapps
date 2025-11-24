<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { App } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import { pages, registerPage, type Page } from './page.js';
    import AppPage from './pages/AppPage.svelte';
    import { currentPage, menuOpen } from './settings.js';

    export let entry: App;
    export let selected: boolean = false;

    $: metadata = entry.metadata;
    $: name = metadata?.name ? omu.i18n.translate(metadata?.name) : entry.id.key();
    $: description = metadata?.description && omu.i18n.translate(metadata?.description) || $t('general.no_description');
    $: icon = metadata?.icon ? omu.i18n.translate(metadata?.icon) : null;
    $: image = metadata?.image ? omu.i18n.translate(metadata?.image) : null;

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

    let lastClickTime = 0;

    function handleClick() {
        const now = Date.now();
        const doubleClick = now - lastClickTime < 300;
        lastClickTime = now;
        if (doubleClick) {
            const id = `app-${entry.id.key()}`;
            delete $pages[id];
            $currentPage = 'explore';
            $currentPage = id;
            dashboard.currentApp = entry;
            return;
        }
        $currentPage = appPage.id;
    }

    $: loaded = $pages[appPage.id];
    $: active = $currentPage === appPage.id;
    $: if (active) {
        dashboard.currentApp = entry;
    };
</script>

<button on:click={handleClick}>
    <Tooltip>
        <div class="tooltip">
            {#if $menuOpen}
                {description}
                {#if loaded}
                    <h3>
                        <span class="loaded">
                            読み込み済み
                            <i class="ti ti-check"></i>
                        </span>
                    </h3>
                {/if}
            {:else}
                <h3>
                    {name}
                    {#if loaded}
                        <span class="loaded">
                            読み込み済み
                            <i class="ti ti-check"></i>
                        </span>
                    {/if}
                </h3>
                <small>{description}</small>
            {/if}
        </div>
    </Tooltip>
    <div class="app" class:selected class:active>
        {#if image}
            <img src={image} alt="" class="image" />
        {/if}
        {#if $menuOpen}
            <div class="info" class:open={$menuOpen}>
                <span class="icon">
                    {#if icon === null}
                        <i class="ti ti-box"></i>
                    {:else if icon.startsWith('ti-')}
                        <i class="ti {icon}"></i>
                    {:else}
                        <img src={icon} alt={name} />
                    {/if}
                </span>
                <p class="name">
                    {name}
                </p>
                <div class="open">
                    <i class="ti ti-chevron-right"></i>
                </div>
            </div>
        {:else}
            <div class="info">
                <span class="icon">
                    {#if icon === null}
                        <i class="ti ti-box"></i>
                    {:else if icon.startsWith('ti-')}
                        <i class="ti {icon}"></i>
                    {:else}
                        <img src={icon} alt={name} />
                    {/if}
                </span>
            </div>
        {/if}
    </div>
</button>

<style lang="scss">
    button {
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        width: 100%;
        height: 4rem;
        display: flex;
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
        margin-left: 0.5rem;

        &.selected,
        &:focus,
        &:hover {
            outline: none;
            transition: background 0.0621s;
            background: var(--color-bg-1);

            > .info > .open {
                visibility: visible;
                margin-right: 0;
                transition: margin 0.0621s;
            }
        }

        &.active {
            background: var(--color-bg-1);
            border-right: 2px solid var(--color-1);
            transition: background 0.0621s;
        }

        > .image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.8;
            filter: blur(.0621rem) contrast(0.621) brightness(1.23621);
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

            &.open {
                padding-left: 1rem;
            }

            > .icon {
                display: flex;
                justify-content: center;
                align-items: center;
                min-width: 2rem;
                min-height: 2rem;
                width: 2rem;
                height: 2rem;
                margin-right: 0.5rem;
                background: var(--color-bg-3);

                > img {
                    width: 2.25rem;
                    height: 2.25rem;
                    object-fit: contain;
                }

                > .ti {
                    font-size: 1.5rem;
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
                position: absolute;
                right: 0;
                visibility: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: auto;
                margin-right: 0.25rem;
                min-width: 2rem;
                height: 2rem;
                color: var(--color-1);
                background: none;
                border: none;
            }
        }
    }
</style>
