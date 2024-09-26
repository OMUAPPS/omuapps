<script lang="ts">
    import type { models } from '@omujs/chat';
    
    import { t } from '$lib/i18n/i18n-context.js';

    import RoomEntry from './RoomEntry.svelte';

    import { chat } from '$lib/client.js';
    import ScreenSetup from '$lib/main/setup/ScreenSetup.svelte';
    import { screenContext } from '$lib/screen/screen.js';
    import { Button, TableList } from '@omujs/ui';

    export let filter: (key: string, room: models.Room) => boolean = () => true;
    export let sort: (a: models.Room, b: models.Room) => number = (a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
    };

    function openSetup() {
        screenContext.push(ScreenSetup, undefined);
    }
</script>

<div class="rooms">
    <TableList table={chat.rooms} component={RoomEntry} {filter} {sort}>
        <div class="empty">
            {$t('panels.rooms.not_found_rooms')}
            <Button on:click={openSetup}>
                {$t('panels.rooms.question_add_channel')}
                <i class="ti ti-external-link" />
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
        padding: 40px 0;
    }
</style>
