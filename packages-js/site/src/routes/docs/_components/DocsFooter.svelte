<script lang="ts">
    import type { DocsSection } from '$lib/server/docs/index.js';

    export let section: DocsSection;
</script>

{#if section}
    <div class="footer">
        <a href="https://github.com/OMUAPPS/omuapps/blob/develop/documentation/site/{section.slug}.md" target="_blank">
            このページをGitHubで編集する
            <i class="ti ti-brand-github"></i>
        </a>
    </div>
{/if}

<style lang="scss">
    .footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 2rem;

        a {
            display: flex;
            align-items: center;
            color: var(--color-1);
            font-size: 0.8rem;

            i {
                margin-left: 0.5rem;
            }
        }
    }
</style>
