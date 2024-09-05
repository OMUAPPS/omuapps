<script lang="ts">
    import type { PackageInfo } from '@omujs/omu/extension/plugin/package-info.js';
    import SvelteMarkdown from 'svelte-markdown';

    export let entry: PackageInfo;
    let open = false;
</script>

<li>
    <span class="name">
        <i class="ti ti-package" />
        <a href={entry.info.package_url} target="_blank" rel="noopener noreferrer">
            {entry.info.name}
        </a>
        <i class="ti ti-external-link" />
    </span>
    {entry.info.summary}
    {#if open}
        <span class="description">
            {#if entry.info.description_content_type === 'text/markdown'}
                <SvelteMarkdown source={entry.info.description} />
            {:else}
                {entry.info.description}
            {/if}
        </span>
    {/if}
</li>

<style>
    li {
        list-style: none;
        padding: 1rem;
        margin: 1rem;
        display: flex;
        align-items: start;
        flex-direction: column;
        gap: 0.5rem;
        border: 1px solid var(--color-outline);
        background: var(--color-bg-1);
        font-weight: 600;
        color: var(--color-1);
    }

    .name {
        font-size: 1rem;
    }
</style>
