<script lang="ts">
    import type { Hint } from '../../quiz-app';

    interface Props {
        hint: Hint;
    }

    let { hint }: Props = $props();
</script>

{#if hint.type === 'text'}
    {hint.body}
{/if}
