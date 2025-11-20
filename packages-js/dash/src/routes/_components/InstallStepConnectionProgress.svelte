<script lang="ts">
    import { run } from 'svelte/legacy';

    import { omu } from '$lib/client';
    import { t } from '$lib/i18n/i18n-context';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { appState, netState } from '../stores';

    run(() => {
        if ($netState?.type === 'reconnecting') {
            if ($netState.attempt && $netState.attempt > 2) {
                $appState = { type: 'restore', message: omu.network.reason?.message };
                omu.stop();
            }
        } else if ($netState?.type === 'disconnected' && $netState.reason) {
            if (![DisconnectType.SERVER_RESTART].includes($netState.reason.type)) {
                $appState = { type: 'restore', message: `${$netState.reason.type}: ${$netState.reason.message}` };
                omu.stop();
            }
        }
    });

    function formatRemainingTime(remaining: number): string {
        if (remaining <= 0) {
            return '0秒';
        }
        const seconds = Math.floor(remaining / 1000) % 60;
        const minutes = Math.floor(remaining / (1000 * 60)) % 60;
        const hours = Math.floor(remaining / (1000 * 60 * 60)) % 24;
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        let result = '';
        if (days > 0) {
            result += `${days}日`;
        }
        if (hours > 0) {
            result += `${hours}時間`;
        }
        if (minutes > 0) {
            result += `${minutes}分`;
        }
        if (seconds > 0) {
            result += `${seconds}秒`;
        }
        return result;
    }
</script>

{#if $netState}
    <p>
        {$t(`status.${$netState.type}`)}
    </p>
    <small>
        {#if $netState.type === 'reconnecting'}
            {$t('status.attempt', {
                count: `${$netState.attempt}`,
                date: formatRemainingTime($netState.timeout),
            })}
        {:else if $netState.type === 'disconnected'}
            {$t('status.attempt', { count: `${$netState.reason}` })}
        {/if}
    </small>
{/if}
