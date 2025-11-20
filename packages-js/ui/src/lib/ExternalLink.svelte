<script lang="ts">
    import { linkOpenHandler } from './stores';
    import Tooltip from './Tooltip.svelte';

    interface Props {
        href?: string;
        title?: string | undefined;
        decorated?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        href = $bindable(''),
        title = undefined,
        decorated = true,
        children
    }: Props = $props();

    if (href?.length && !href.startsWith('http')) {
        href = `https://${href}`;
    }
</script>

<a class:decorated {href} {title} target="_blank" rel="noopener noreferrer" onclick={(event) => {
    if (!$linkOpenHandler) return;
    const prevent = $linkOpenHandler(href);
    if (!prevent) return;
    event.preventDefault();
}}>
    <Tooltip>
        {href}
    </Tooltip>
    {@render children?.()}
</a>

<style lang="scss">
    a:not(.decorated) {
        color: inherit;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
</style>
