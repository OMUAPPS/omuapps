<script lang="ts">
    import { ExternalLink } from '@omujs/ui';

    export let href: string;
    export let title: string;
</script>

<ExternalLink {href} {title} decorated={false}>
    <slot />
    <i class="ti ti-external-link"></i>
</ExternalLink>
