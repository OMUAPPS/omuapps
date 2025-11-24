<script lang="ts">
    import type { Models } from '@omujs/chat';

    import ChannelEntry from './EntryChannel.svelte';

    import { chat } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { TableList, Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';

    interface Props {
        filter?: (key: string, message: Models.Channel) => boolean;
    }

    let { filter = () => true }: Props = $props();

    let checkIntervalLeft = $state(0);

    const interval = setInterval(() => {
        checkIntervalLeft = 15 - ((new Date().getTime() / 1000) % 15);
    }, 1000);

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<div class="list">
    <TableList table={chat.channels} {filter}>
        {#snippet component({ entry, selected })}
            <ChannelEntry {entry} {selected} />
        {/snippet}
    </TableList>
    <div class="check-interval">
        <Tooltip>
            {$t('panels.channels.next_check')}
            {Math.floor(checkIntervalLeft)}
            {$t('general.second')}
        </Tooltip>
        <p>
            {Math.floor(checkIntervalLeft)}
        </p>
    </div>
</div>

<style lang="scss">
    .list {
        position: relative;
        background: var(--color-bg-2);
        width: 100%;
        height: 100%;

        &:hover {
            .check-interval {
                opacity: 1;
            }
        }
    }

    .check-interval {
        position: absolute;
        bottom: 0;
        right: 0;
        padding: 0.5rem;
        opacity: 0.2621;

        > p {
            color: var(--color-text);
            font-size: 0.8rem;
            font-weight: 500;
        }
    }
</style>
