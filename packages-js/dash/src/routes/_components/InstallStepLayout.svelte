<script lang="ts">
</script>

<div class="content">
    <div class="main">
        <slot />
    </div>
    <div class="hint">
        <slot name="hint" />
    </div>
</div>

<style lang="scss">
    .content {
        position: absolute;
        inset: 0;
        display: flex;
        background: var(--color-bg-1);
    }

    $padding-vertically: max(8rem, 12%);

    .main {
        position: relative;
        width: 24rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        padding: $padding-vertically 2rem;
        padding-bottom: 15%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .hint {
        position: relative;
        padding: $padding-vertically 2rem;
        padding-bottom: 15%;
        display: flex;
        flex: 1;
        justify-content: flex-start;
    }
</style>
