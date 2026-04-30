<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        open?: boolean;
        name: string;
        children?: Snippet<[]>;
    }

    let { open = $bindable(false), name, children }: Props = $props();
</script>

<div class="collapse">
    <button onclick={() => {
        open = !open;
    }} class:open>
        <span>{name}</span>
        <i class="ti {open ? 'ti-chevron-up' : 'ti-chevron-down'}"></i>
    </button>

    {#if open}
        <div class="children">
            {@render children?.()}
        </div>
    {/if}
</div>

<style lang="scss">
    .collapse {
        display: flex;
        flex-direction: column;
        background: var(--color-bg-1);
        border-radius: 4px 4px 0 0;
        overflow: hidden;
    }

    button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--color-bg-1);
        color: var(--color-text);
        border: none;
        font-weight: 600;
        font-size: 0.8rem;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-1);

        &.open {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }

    .children {
        border: 1px solid var(--color-1);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
</style>
