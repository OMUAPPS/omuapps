<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        name: string;
        icon?: string;
        children: Snippet<[]>;
    }

    let { name, icon, children }: Props = $props();
</script>

<section>
    <h2>
        {name}
        {#if icon}
            <i class="ti {icon}"></i>
        {/if}
    </h2>
    {@render children()}
</section>

<style lang="scss">
    h2 {
        margin-bottom: 0.5rem;
        text-align: center;
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
        font-size: 1.17em;
    }

    section {
        background: var(--color-bg-2);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
