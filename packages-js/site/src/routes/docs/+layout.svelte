<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { DocsSection } from '$lib/server/docs';
    import { Tooltip } from '@omujs/ui';
    import github from 'svelte-highlight/styles/github';
    import { writable } from 'svelte/store';
    import DocsFooter from './_components/DocsFooter.svelte';
    import DocsNav from './_components/DocsNav.svelte';
    import { config, GROUP_NAMES } from './constants.js';
    import { docs } from './stores.js';

    export let data: { sections: Record<string, DocsSection[]> };

    $: sections = data.sections;
    $: section = Object.values(sections)
        .flat()
        .find((s) => s.slug === $docs?.slug);
    $: group =
        section &&
        Object.entries(sections).find(([, entries]) =>
            entries.includes(section),
        );

    function createSetting<T>(key: string, defaultValue: T) {
        if (typeof localStorage === 'undefined') {
            return writable<T>(defaultValue);
        }
        let value = localStorage.getItem(key);
        if (value) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                console.error(e);
                localStorage.removeItem(key);
            }
        }
        const store = writable<T>(
            localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : defaultValue,
        );
        store.subscribe((value) => localStorage.setItem(key, JSON.stringify(value)));
        return store;
    }
    let menuOpen = createSetting('site/docs/menu_open', true);
    let openedGroups = createSetting<string[]>('site/docs/opened_groups', []);
    let selectedGroup: string | undefined = undefined;
    $: selectedGroup = $docs?.group;
</script>

<svelte:head>
    <svelte:element this="style">
        {github}
    </svelte:element>
    <title>{$docs?.meta.title || 'ドキュメント'} | OMUAPPS</title>
    <meta name="description" content={$docs?.meta.description} />
    <link rel="canonical" href={`https://omuapps.com/docs/${$docs?.slug}`} />
</svelte:head>

<Page>
    <header slot="header">
        {#if $docs}
            {@const meta = $docs.meta}
            <span>
                <h1>
                    {meta.title}
                    <i class="ti ti-{meta.icon || 'pencil'}"></i>
                </h1>
                <small> {meta.description} </small>
            </span>
        {/if}
    </header>
    <main slot="content">
        <div class="content">
            <DocsNav {section} {group} />
            <div class="markdown">
                <h2 class="warning">
                    現在ドキュメントは制作段階にあるため、多くの情報が不完全なものになっています
                    <i class="ti ti-alert-hexagon"></i>
                </h2>
                {@render children?.()}
            </div>
            <DocsNav {section} {group} />
            {#if section}
                <DocsFooter {section} />
            {/if}
        </div>
        <div class="groups omu-scroll" class:open={$menuOpen}>
            <button class="menu-toggle" onclick={() => ($menuOpen = !$menuOpen)}>
                {#if $menuOpen}
                    閉じる
                {:else}
                    開く
                {/if}
                <i class="ti ti-menu"></i>
            </button>
            {#if $menuOpen}
                {#each Object.entries(sections) as [group, entries], index (index)}
                    {#if group !== 'index'}
                        <button class="group-toggle" onclick={() => {
                            if (selectedGroup === group) {
                                selectedGroup = undefined;
                            }
                            if ($openedGroups.includes(group)) {
                                $openedGroups = $openedGroups.filter((it) => it != group);
                            } else {
                                $openedGroups = [...$openedGroups, group];
                            }
                        }}>
                            {GROUP_NAMES[group] ?? group}
                            <i class="ti ti-chevron-down"></i>
                        </button>
                    {/if}
                    {#if group === 'index' || $openedGroups.includes(group) || selectedGroup === group}
                        <div class="sections">
                            {#each entries as section, index (index)}
                                <a
                                    href={`/docs/${section.slug}`}
                                    class:selected={section.slug === $docs?.slug}
                                >
                                    <Tooltip>{section.meta.description}</Tooltip>
                                    {section.meta.title}
                                    <i class="ti ti-chevron-right"></i>
                                </a>
                            {/each}
                        </div>
                    {/if}
                {/each}
                <div class="config">
                    使用するパッケージマネージャー
                    <div class="package-manager">
                        <button
                            onclick={() => ($config.PACKAGE_MANAGER = 'npm')}
                            class:selected={$config.PACKAGE_MANAGER === 'npm'}
                        >
                            npm
                            <i class="ti ti-brand-npm"></i>
                        </button>
                        <button
                            onclick={() => ($config.PACKAGE_MANAGER = 'yarn')}
                            class:selected={$config.PACKAGE_MANAGER === 'yarn'}
                        >
                            yarn
                            <i class="ti ti-brand-yarn"></i>
                        </button>
                        <button
                            onclick={() => ($config.PACKAGE_MANAGER = 'pnpm')}
                            class:selected={$config.PACKAGE_MANAGER === 'pnpm'}
                        >
                            pnpm
                            <i class="ti ti-brand-pnpm"></i>
                        </button>
                        <button
                            onclick={() => ($config.PACKAGE_MANAGER = 'bun')}
                            class:selected={$config.PACKAGE_MANAGER === 'bun'}
                        >
                            bun
                            <i class="ti ti-package"></i>
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </main>
</Page>

<style lang="scss">
    :global(body) {
        overflow-y: scroll;
    }

    main {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: 4rem;
        width: 100%;
        padding-right: min(calc(70rem - 100%), calc(100% - 20rem));
    }

    .content {
        flex: 1;
        width: 100%;
    }

    .markdown {
        margin: 2rem 0;
        padding: 2rem 0;
        border: 1px solid var(--color-outline);
        border-left: 0;
        border-right: 0;
    }

    .warning {
        display: flex;
        align-items: center;
        padding: 1rem;
        gap: 1rem;
        background: var(--color-bg-1);
        color: var(--color-1);

        > i {
            font-size: 1.5rem;
        }
    }

    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);

        > i {
            font-size: 1.5rem;
            margin-left: 0.5rem;
        }
    }

    .groups {
        z-index: 100;
        position: fixed;
        top: 0;
        right: 0;
        height: 5rem;
        border-left: 1px solid var(--color-outline);
        background: var(--color-bg-2);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.7rem;
        width: 18rem;
        overflow-y: auto;

        &.open {
            bottom: 0;
            height: 100%;

            > .menu-toggle {
                position: sticky;
                left: 0;
                right: 0;
                top: 0;
                padding: 2rem;
                height: 5rem;
                margin-bottom: 4rem;
            }
        }

        > .menu-toggle {
            position: sticky;
            left: 0;
            right: 0;
            top: 0;
            height: 5rem;
            border: none;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-outline);
        }

        > a {
            padding: 0 4rem;
        }

        > .group-toggle {
            font-size: 0.8rem;
            color: var(--color-1);
            margin: 0 1rem;
            padding: 0 0.5rem;
            padding-bottom: 0.25rem;
            padding-top: 0.5rem;
            background: none;
            border: none;
            font-size: 0.9rem;
            font-weight: 900;
            text-align: start;
            display: flex;
            align-items: baseline;
            justify-content: space-between;

            &:hover {
                background: var(--color-bg-1);
            }
        }
    }

    .sections {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        background: var(--color-bg-2);
        border-top: 1px solid var(--color-outline);
        padding-top: 0.5rem;
        margin: 0 1.5rem;

        > a {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            color: var(--color-text);
            font-size: 0.8rem;
            text-decoration: none;
            padding: 1rem 1.5rem;

            > i {
                font-size: 0.8rem;
                margin-right: 2px;
                visibility: hidden;
            }

            &:hover,
            &.selected {
                > i {
                    visibility: visible;
                    margin-right: 0;
                    transition: margin-right 0.01621s;
                }
            }

            &:hover {
                color: var(--color-1);
                background: var(--color-bg-1);
            }

            &.selected {
                color: var(--color-1);
                background: var(--color-bg-1);
            }
        }
    }

    .config {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid var(--color-outline);
        padding-top: 0.5rem;
        margin: 1.5rem;
        margin-top: auto;

        > .package-manager {
            display: grid;
            grid-template-columns: repeat(3, 1fr);

            > button {
                display: flex;
                align-items: center;
                flex-direction: column;
                gap: 0.25rem;
                border: none;
                background: var(--color-bg-2);
                color: var(--color-text);
                font-size: 0.8rem;
                font-weight: 600;
                padding: 0.5rem 1rem;
                cursor: pointer;

                > i {
                    font-size: 1rem;
                }

                &:hover,
                &.selected {
                    color: var(--color-1);
                    background: var(--color-bg-1);
                }
            }
        }
    }
</style>
