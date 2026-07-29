<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="table-container">
    <table>
        {@render children?.()}
    </table>
</div>

<style lang="scss">
    .table-container {
        width: 100%;
        margin: 1.5rem 0;
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-spacing: 0;
        border-collapse: collapse;
        background: var(--color-bg-2);

        :global(th),
        :global(td) {
            min-width: 8rem;
            padding: 0.75rem 1rem;
            line-height: 1.5;
            vertical-align: top;
            border-right: 1px solid var(--color-outline);
            border-bottom: 1px solid var(--color-outline);
        }

        :global(th) {
            color: var(--color-1);
            white-space: nowrap;
            background: var(--color-bg-1);
        }

        :global(th:last-child),
        :global(td:last-child) {
            border-right: none;
        }

        :global(tr:last-child td) {
            border-bottom: none;
        }
    }
</style>
