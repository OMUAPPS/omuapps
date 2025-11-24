<script lang="ts">
    import { Textbox } from '@omujs/ui';
    import type { Hint } from '../../quiz-app';

    interface Props {
        hint: Hint;
    }

    let { hint = $bindable() }: Props = $props();
</script>

{#if hint.type === 'text'}
    <Textbox bind:value={hint.body} />
{/if}
