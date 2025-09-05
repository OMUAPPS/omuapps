<script lang="ts">
    import type { PackageInfo } from '@omujs/omu/api/plugin';
    import SvelteMarkdown from 'svelte-markdown';

    export let entry: PackageInfo;
    let open = false;

    $: author =
        entry.info.author ||
        entry.info.author_email.replace(/<[\w+]+@[\w.]+>/gm, '').trim();
</script>

<li>
    <i class="icon ti ti-package" />
    <div class="info">
        <span class="name">
            <a
                href={entry.info.package_url}
                target="_blank"
                rel="noopener noreferrer"
            >
                {entry.info.name}
            </a>
            <i class="ti ti-external-link"></i>
            <span class="version">
                v{entry.info.version}
            </span>
            {#if author}
                <span class="author">
                    <small>by</small>
                    {author}
                </span>
            {/if}
        </span>
        <small class="summary">
            {entry.info.summary}
        </small>
    </div>
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

<style lang="scss">
    li {
        list-style: none;
        margin: 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: var(--color-bg-1);
        font-weight: 600;
        color: var(--color-1);
    }

    .icon {
        font-size: 1.5rem;
    }

    .info {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 0.25rem;
    }

    .name {
        width: 100%;
        display: flex;
        align-items: baseline;
        font-size: 0.9rem;
    }

    .name a {
        color: var(--color-1);
        text-decoration: none;
    }

    .author {
        font-size: 0.86rem;
        font-weight: 600;
        color: var(--color-1);
        margin-left: auto;

        > small {
            color: var(--color-text);
            font-size: 0.6rem;
        }
    }

    .version {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-1);
        margin-left: 0.5rem;
    }

    .summary {
        color: var(--color-text);
    }
</style>
