<script lang="ts">
    export let title: string;
    export let subtitle: string | undefined = undefined;
    export let icon: string;
</script>

<header>
    <div class="title">
        {#if icon.startsWith('ti-')}
            <i class="ti {icon}" />
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
    <slot />
</header>

<style lang="scss">
    header {
        display: flex;
        flex-direction: row;
        gap: 40px;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 80px;
        padding: 20px 40px;
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
        width: 40px;
        height: 40px;
    }

    .text {
        display: flex;
        flex-direction: column;
    }

    .subtitle {
        font-size: 0.6rem;
        font-weight: 600;
    }
</style>
