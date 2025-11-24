<script lang="ts">
    import { linkOpenHandler } from './stores';
    import Tooltip from './Tooltip.svelte';

    export let href: string = '';
    export let title: string | undefined = undefined;
    export let decorated: boolean = true;

    if (href?.length && !href.startsWith('http')) {
        href = `https://${href}`;
    }
</script>

<a class:decorated {href} {title} target="_blank" rel="noopener noreferrer" on:click={(event) => {
    if (!$linkOpenHandler) return;
    const prevent = $linkOpenHandler(href);
    if (!prevent) return;
    event.preventDefault();
}}>
    <Tooltip>
        {href}
    </Tooltip>
    <slot />
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
