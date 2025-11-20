<script lang="ts">
    import { ExternalLink } from '@omujs/ui';

    interface Props {
        href: string;
        title: string;
        children?: import('svelte').Snippet;
    }

    let { href, title, children }: Props = $props();
</script>

<ExternalLink {href} {title} decorated={false}>
    {@render children?.()}
    <i class="ti ti-external-link"></i>
</ExternalLink>
