<script lang="ts">
    interface Props {
        title: string;
        subtitle?: string | undefined;
        icon: string;
        children?: import('svelte').Snippet;
    }

    let {
        title,
        subtitle = undefined,
        icon,
        children,
    }: Props = $props();
</script>

<div class="header">
    <div class="title">
        {#if icon.startsWith('ti-')}
            <i class="ti {icon}"></i>
        {:else}
            <img src={icon} alt={title} />
        {/if}
        <span class="text">
            {title}
            {#if subtitle}
                <span class="subtitle">{subtitle}</span>
            {/if}
        </span>
    </div>
    {@render children?.()}
</div>

<style lang="scss">
    .header {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 5rem;
        padding: 2.5rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
    }

    .title {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: center;
        font-size: 1rem;
        font-weight: 600;
    }

    img {
        width: 2.5rem;
        height: 2.5rem;
    }

    i {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        font-size: 1.2621rem;
    }

    .text {
        display: flex;
        flex-direction: column;
    }

    .subtitle {
        color: var(--color-text);
        font-size: 0.6621rem;
        font-weight: 600;
    }
</style>
