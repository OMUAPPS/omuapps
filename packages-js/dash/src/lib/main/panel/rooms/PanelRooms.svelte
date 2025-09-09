<script lang="ts">
    import type { models } from '@omujs/chat';

    import { t } from '$lib/i18n/i18n-context.js';

    import RoomEntry from './RoomEntry.svelte';

    import { chat } from '$lib/client.js';
    import { Button, TableList } from '@omujs/ui';

    export let openSetup: () => void = () => {};
    export let filter: (key: string, room: models.Room) => boolean = () => true;
    export let sort: (a: models.Room, b: models.Room) => number = (a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
    };
</script>

<div class="rooms">
    <TableList table={chat.rooms} component={RoomEntry} {filter} {sort}>
        <div class="empty">
            {$t('panels.rooms.not_found_rooms')}
            <Button onclick={openSetup}>
                {$t('panels.rooms.question_add_channel')}
                <i class="ti ti-external-link"></i>
            </Button>
        </div>
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
