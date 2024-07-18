<script lang="ts">
    import { Header } from '@omujs/ui';
    import PanelChannels from '../panel/channels/PanelChannels.svelte';
    import PanelMessages from '../panel/messages/PanelMessages.svelte';
    import PanelRooms from '../panel/rooms/PanelRooms.svelte';
    import { t } from '$lib/i18n/i18n-context.js';

    export const props = {};
</script>

<Header icon="ti-bolt" title={$t('page.connect.title')} subtitle={$t('page.connect.tooltip')} />
<main>
    <div class="panels">
        <div class="left">
            <p>
                チャンネル
                <i class="ti ti-user" />
            </p>
            <div class="channels">
                <PanelChannels />
            </div>
            <p>
                配信
                <i class="ti ti-bolt" />
            </p>
            <div class="rooms">
                <PanelRooms />
            </div>
        </div>
        <dir class="right">
            <p>
                チャット
                <i class="ti ti-message" />
            </p>
            <div class="chat">
                <PanelMessages />
            </div>
        </dir>
    </div>
</main>

<style lang="scss">
    main {
        position: relative;
        height: 100%;
        display: flex;
    }

    p {
        color: var(--color-1);
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }

    .panels {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 5rem;
        display: flex;
        padding: 1rem;
        gap: 1rem;
    }

    $channel-height: 16rem;
    $right-width: 400px;

    .left {
        display: flex;
        flex-direction: column;
        width: calc(100% - $right-width);
        height: 100%;

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
        width: $right-width;
        max-height: 100%;

        .chat {
            max-height: 100%;
            background: var(--color-bg-2);
        }
    }
</style>
