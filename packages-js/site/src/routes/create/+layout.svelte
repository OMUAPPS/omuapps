<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { DocsSection } from '$lib/server/docs/index.js';
    import { FlexRowWrapper } from '@omujs/ui';
    import { config } from './constants.js';
    import { docs } from './stores.js';
    export let data: { sections: Record<string, DocsSection[]> };

    $: sections = data.sections;
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
        <slot />
        <div class="groups">
            {#each Object.entries(sections) as [group, entries] (group)}
                <h3>{group}</h3>
                <div class="sections">
                    {#each entries as section (section.slug)}
                        <a href={`/create/${section.slug}`} class:selected={section.slug === $docs?.slug}>
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
        top: 25%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 0.7rem;
        height: 100%;

        > h3 {
            font-size: 0.8rem;
            color: var(--color-1);
        }
    }

    .sections {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 200px;
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
