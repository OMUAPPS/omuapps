<script lang="ts">
    import { goto } from '$app/navigation';
    import { BROWSER } from 'esm-env';

    if (BROWSER) {
        goto('/create/index');
    }
</script>
