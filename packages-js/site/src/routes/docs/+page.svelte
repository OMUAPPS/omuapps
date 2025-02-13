<script lang="ts">
    import { goto } from '$app/navigation';
    import { BROWSER } from 'esm-env';

    if (BROWSER) {
        goto('/docs/0-index');
    }
</script>
