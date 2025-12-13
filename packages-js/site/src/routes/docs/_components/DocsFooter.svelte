<script lang="ts">
    import type { DocsSection } from '../server';

    interface Props {
        section: DocsSection;
    }

    let { section }: Props = $props();
</script>

{#if section}
    <div class="footer">
        <a
            href={section.editUrl}
            target="_blank"
        >
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
