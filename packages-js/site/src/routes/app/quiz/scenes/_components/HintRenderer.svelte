<script lang="ts">
    import type { Hint } from '../../quiz-app';

    export let hint: Hint;
</script>

{#if hint.type === 'text'}
    {hint.body}
{/if}
