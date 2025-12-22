<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { DocsMeta } from '../server';

    interface Props {
        section:
            | Readonly<{
                meta: DocsMeta;
                slug: string;
            }>
            | undefined;
        group:
            | [
                string,
                Readonly<{
                    meta: DocsMeta;
                    slug: string;
                }>[],
            ]
            | undefined;
    }

    let { section, group }: Props = $props();
</script>

{#if section && group && group[1].length > 1}
    {@const [, groupEntries] = group}
    {@const index = groupEntries.indexOf(section)}
    {@const prev = groupEntries[index - 1]}
    {@const next = groupEntries[index + 1]}
    <div class="nav">
        <span>
            {#if prev}
                <a href={`/docs/${prev.slug}`} style="align-items: flex-start;">
                    <Tooltip>
                        {prev.meta.description}
                    </Tooltip>
                    <small>
                        <i class="ti ti-chevron-left"></i>
                        前へ
                    </small>
                    <p>{prev.meta.title}</p>
                </a>
            {/if}
        </span>
        <span>
            {#if next}
                <a href={`/docs/${next.slug}`} style="align-items: flex-end;">
                    <Tooltip>
                        {next.meta.description}
                    </Tooltip>
                    <small>
                        次へ
                        <i class="ti ti-chevron-right"></i>
                    </small>
                    <p>{next.meta.title}</p>
                </a>
            {/if}
        </span>
    </div>
{/if}

<style lang="scss">
    .nav {
        display: flex;
        justify-content: space-between;
        gap: 1rem;

        > span {
            display: flex;
            flex: 1;
            max-width: 14rem;
        }

        > span > a {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 0.5rem;
            color: var(--color-text);
            font-size: 0.9rem;
            text-decoration: none;
            padding: 1rem 1.25rem;
            background: var(--color-bg-1);
            color: var(--color-1);
            width: 100%;
        }

        small {
            color: var(--color-text);
        }
    }
</style>
