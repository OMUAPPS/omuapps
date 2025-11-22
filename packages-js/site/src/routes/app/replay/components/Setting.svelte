<script lang="ts">
    interface Props {
        name: string;
        children?: import('svelte').Snippet;
    }

    let { name, children }: Props = $props();
</script>

<label class="setting">
    <small>{name}</small>
    {@render children?.()}
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
