<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { DocsSection } from '$lib/server/docs/index.js';
    import { FlexRowWrapper } from '@omujs/ui';
    import github from 'svelte-highlight/styles/github';
    import DocsFooter from './_components/DocsFooter.svelte';
    import DocsNav from './_components/DocsNav.svelte';
    import { config } from './constants.js';
    import { docs } from './stores.js';
    
    export let data: { sections: Record<string, DocsSection[]> };

    $: sections = data.sections;
    $: section = Object.values(sections).flat().find((s) => s.slug === $docs?.slug);
    $: group = section && Object.entries(sections).find(([, entries]) => entries.includes(section));
</script>


<svelte:head>
    <svelte:element this="style">
        {github}
    </svelte:element>
</svelte:head>

<Page header="always">
    <header slot="header">
        {#if $docs}
            {@const meta = $docs.meta}
            <FlexRowWrapper widthFull heightFull between>
                <span>
                    <h1>
                        {meta.title}
                        <i class="ti ti-{meta.icon || 'pencil'}"></i>
                    </h1>
                    <small> {meta.description} </small>
                </span>
            </FlexRowWrapper>
        {/if}
    </header>
    <main slot="content">
        <div class="content">
            <DocsNav {section} {group} />
            <div class="markdown">
                <slot />
            </div>
            <DocsNav {section} {group} />
            {#if section}
                <DocsFooter {section} />
            {/if}
        </div>
        <div class="groups">
            {#each Object.entries(sections) as [group, entries] (group)}
                <h3>{group}</h3>
                <div class="sections">
                    {#each entries as section (section.slug)}
                        <a href={`/docs/${section.slug}`} class:selected={section.slug === $docs?.slug}>
                            {section.meta.title}
                            <i class="ti ti-chevron-right"></i>
                        </a>
                    {/each}
                </div>
            {/each}
            <div class="config">
                使用するパッケージマネージャー
                <div class="package-manager">
                    <button on:click={() => $config.PACKAGE_MANAGER = 'npm'} class:selected={$config.PACKAGE_MANAGER === 'npm'}>
                        npm
                        <i class="ti ti-brand-npm"></i>
                    </button>
                    <button on:click={() => $config.PACKAGE_MANAGER = 'yarn'} class:selected={$config.PACKAGE_MANAGER === 'yarn'}>
                        yarn
                        <i class="ti ti-brand-yarn"></i>
                    </button>
                    <button on:click={() => $config.PACKAGE_MANAGER = 'pnpm'} class:selected={$config.PACKAGE_MANAGER === 'pnpm'}>
                        pnpm
                        <i class="ti ti-brand-pnpm"></i>
                    </button>
                    <button on:click={() => $config.PACKAGE_MANAGER = 'bun'} class:selected={$config.PACKAGE_MANAGER === 'bun'}>
                        bun
                        <i class="ti ti-package"></i>
                    </button>
                </div>
            </div>
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
        margin-top: 1rem;
        padding-top: 1rem;
        margin-bottom: 2rem;
        padding-bottom: 2rem;
        border: 1px solid var(--color-outline);
        border-left: 0;
        border-right: 0;
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
        position: fixed;
        padding: 2rem;
        margin-top: 5rem;
        padding-top: 4rem;
        padding-right: 2rem;
        top: 0;
        bottom: 0;
        right: 0;
        border-left: 1px solid var(--color-outline);
        background: var(--color-bg-2);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 0.7rem;
        min-width: 14rem;
        overflow-y: auto;
        z-index: 1;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        > h3 {
            font-size: 0.8rem;
            color: var(--color-1);
        }
    }

    .sections {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        background: var(--color-bg-2);
        border-top: 1px solid var(--color-outline);
        padding-top: 0.5rem;

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

            &:hover, &.selected {
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

                &:hover, &.selected {
                    color: var(--color-1);
                    background: var(--color-bg-1);
                }
            }
        }
    }
</style>
