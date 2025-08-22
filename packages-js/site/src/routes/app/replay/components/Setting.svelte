<script lang="ts">
    export let name: string;
</script>

<label class="setting">
    <small>{name}</small>
    <slot />
</label>

<style lang="scss">
    .setting {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.5rem;
        color: var(--color-text);

        &:hover {
            background: var(--color-bg-1);
        }
    }
</style>
