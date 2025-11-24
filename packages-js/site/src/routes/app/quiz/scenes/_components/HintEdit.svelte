<script lang="ts">
    import { Textbox } from '@omujs/ui';
    import type { Hint } from '../../quiz-app';

    export let hint: Hint;
</script>

{#if hint.type === 'text'}
    <Textbox bind:value={hint.body} />
{/if}
