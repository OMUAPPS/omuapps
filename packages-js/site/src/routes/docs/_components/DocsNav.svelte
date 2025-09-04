<script lang="ts">
    import type { DocsMeta } from "$lib/server/docs";

    export let section:
        | Readonly<{
              meta: DocsMeta;
              slug: string;
          }>
        | undefined;
    export let group:
        | [
              string,
              Readonly<{
                  meta: DocsMeta;
                  slug: string;
              }>[],
          ]
        | undefined;
</script>

{#if section && group && group[1].length > 1}
    {@const [, groupEntries] = group}
    {@const index = groupEntries.indexOf(section)}
    {@const prev = groupEntries[index - 1]}
    {@const next = groupEntries[index + 1]}
    <div class="nav">
        <span>
            {#if prev}
                <a href={`/docs/${prev.slug}`}>
                    <i class="ti ti-chevron-left"></i>
                    {prev.meta.title}
                    <i class="ti ti-{prev.meta.icon || 'pencil'}"></i>
                </a>
            {/if}
        </span>
        <span>
            {#if next}
                <a href={`/docs/${next.slug}`}>
                    <i class="ti ti-{next.meta.icon || 'pencil'}"></i>
                    {next.meta.title}
                    <i class="ti ti-chevron-right"></i>
                </a>
            {/if}
        </span>
    </div>
{/if}

<style lang="scss">
    .nav {
        display: flex;
        justify-content: space-between;

        > span > a {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--color-text);
            font-size: 0.8rem;
            text-decoration: none;
            padding: 1rem 1.5rem;
            background: var(--color-bg-1);

            > i {
                font-size: 1rem;
            }
        }
    }
</style>
