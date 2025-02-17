<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { DocsSection } from '$lib/server/docs/index.js';
    import { FlexRowWrapper } from '@omujs/ui';
    import { docs } from './stores.js';

    export let data: { sections: DocsSection[] };

    $: slug = $docs?.slug;
    $: title = $docs?.title;
    $: sections = data.sections;
</script>

<Page>
    <header slot="header">
        <FlexRowWrapper widthFull heightFull between>
            <span>
                <h1>
                    {slug}
                    <i class="ti ti-pencil"></i>
                </h1>
                <small> {title} </small>
            </span>
        </FlexRowWrapper>
    </header>
    <main slot="content">
        <div class="sections">
            <a href="/create/index">Docs</a>
            {#each sections as section (section.slug)}
                <a href={`/create/${section.slug}`}>{section.title}</a>
            {/each}
        </div>
        <slot />
    </main>
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }

    main {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .sections {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
        width: 200px;
        background: var(--color-bg-2);
    }
</style>
