<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { DocsSection } from '$lib/server/docs/index.js';
    import { FlexRowWrapper } from '@omujs/ui';
    import DocsFooter from './_components/DocsFooter.svelte';
    import DocsNav from './_components/DocsNav.svelte';
    import { config } from './constants.js';
    import { docs } from './stores.js';
    
    export let data: { sections: Record<string, DocsSection[]> };

    $: sections = data.sections;
    $: section = Object.values(sections).flat().find((s) => s.slug === $docs?.slug);
    $: group = section && Object.entries(sections).find(([, entries]) => entries.includes(section));
</script>

<Page>
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
    }

    .content {
        flex: 1;
    }

    .markdown {
        margin: 2rem 0;
        padding: 2rem 0;
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
        position: sticky;
        top: 6rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 0.7rem;
        max-height: calc(100vh - 8rem);
        min-width: 14rem;
        overflow-y: auto;

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
