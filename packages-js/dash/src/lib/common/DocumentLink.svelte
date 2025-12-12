<script lang="ts">
    import { linkOpenHandler, Tooltip } from '@omujs/ui';

    interface Props {
        href: string;
        title: string;
        children?: import('svelte').Snippet;
    }

    let { href, title, children }: Props = $props();
</script>

<a {href} {title} target="_blank" rel="noopener noreferrer" onclick={(event) => {
    if (!$linkOpenHandler) return;
    const prevent = $linkOpenHandler(href);
    if (!prevent) return;
    event.preventDefault();
}}>
    <Tooltip>
        {href}
    </Tooltip>
    {@render children?.()}
    <i class="ti ti-external-link"></i>
</a>
