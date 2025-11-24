<script lang="ts">
    import type { App } from '@omujs/omu';

    interface Props {
        entry: App;
    }

    let { entry }: Props = $props();
</script>

{entry.id.key()}
