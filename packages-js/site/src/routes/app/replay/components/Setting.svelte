<script lang="ts">
    interface Props {
        name: string;
        disableAuto?: boolean;
        children?: import('svelte').Snippet;
    }

    let { name, disableAuto: disableAuto, children }: Props = $props();
</script>

<label class="setting" for={disableAuto ? '' : undefined}>
    <small>{name}</small>
    {@render children?.()}
</label>

<style lang="scss">
    .setting {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: var(--color-text);
        gap: 1rem;

        &:hover {
            background: var(--color-bg-1);
        }

        small {
            margin-right: auto;
        }
    }
</style>
