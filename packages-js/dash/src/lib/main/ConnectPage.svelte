<script lang="ts">
    import { Header } from '@omujs/ui';
    import PanelChannels from './panel/channels/PanelChannels.svelte';
    import PanelMessages from './panel/messages/PanelMessages.svelte';
    import PanelRooms from './panel/rooms/PanelRooms.svelte';
    import { t } from '$lib/i18n/i18n-context.js';

    export let props: {};
</script>

<Header icon="ti-message" title={$t('pages.message')} subtitle="message" />
<div class="panels">
    <div class="left">
        チャンネル
        <div class="channels">
            <PanelChannels />
        </div>
        配信
        <div class="rooms">
            <PanelRooms />
        </div>
    </div>
    <dir class="right">
        チャット
        <div class="chat">
            <PanelMessages />
        </div>
    </dir>
</div>

<style lang="scss">
    .panels {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
    }

    $channel-height: 16rem;
    $right-width: 400px;

    .left {
        display: flex;
        flex-direction: column;
        width: calc(100% - $right-width);
        height: 100%;
        padding: 1rem;
        gap: 1rem;

        .channels {
            height: $channel-height;
            background: var(--color-bg-2);
        }

        .rooms {
            background: var(--color-bg-2);
            height: calc(100% - #{$channel-height});
            background: var(--color-bg-2);
        }
    }

    .right {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: $right-width;
        margin: 1rem;
        height: 100%;

        .chat {
            height: 100%;
            background: var(--color-bg-2);
        }
    }
</style>
