<script lang="ts">
    import { ExternalLink } from '@omujs/ui';

    export let href: string;
    export let title: string;
</script>

<ExternalLink {href} {title} decorated={false}>
    {@render children?.()}
    <i class="ti ti-external-link"></i>
</ExternalLink>
