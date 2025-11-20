<script lang="ts">
    import type { Models } from '@omujs/chat';

    import { t } from '$lib/i18n/i18n-context.js';

    import RoomEntry from './RoomEntry.svelte';

    import { chat } from '$lib/client.js';
    import { Button, TableList } from '@omujs/ui';

    interface Props {
        openSetup?: () => void;
        filter?: (key: string, room: Models.Room) => boolean;
        sort?: (a: Models.Room) => number;
    }

    let { openSetup = () => {}, filter = () => true, sort = (a) => {
        if (!a.metadata.created_at) return 0;
        return new Date(a.metadata.created_at).getTime();
    } }: Props = $props();
</script>

<div class="rooms">
    <TableList
        table={chat.rooms}
        {filter}
        {sort}
        reverse={true}
    >
        {#snippet component({ entry, selected })}
            <RoomEntry {entry} {selected} />
        {/snippet}
        {#snippet empty()}
            <div class="empty">
                {$t('panels.rooms.not_found_rooms')}
                <Button onclick={openSetup}>
                    {$t('panels.rooms.question_add_channel')}
                    <i class="ti ti-external-link"></i>
                </Button>
            </div>
        {/snippet}
    </TableList>
</div>

<style lang="scss">
    .rooms {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2.5rem 0;
    }
</style>
