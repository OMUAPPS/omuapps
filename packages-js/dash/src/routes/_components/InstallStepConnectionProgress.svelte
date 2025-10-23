<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import { netState, state } from '../stores';

    $: {
        if ($netState?.type === 'reconnecting') {
            if ($netState.attempt && $netState.attempt > 2) {
                $state = { type: 'restore' };
            }
        }
    }
</script>

{#if $netState}
    {$t(`status.${$netState.type}`)}
    <pre>{JSON.stringify($netState, null, 2)}</pre>
{/if}
