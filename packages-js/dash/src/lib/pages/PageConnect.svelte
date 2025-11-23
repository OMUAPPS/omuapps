<script lang="ts">
    import { chat, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { ChatEvents } from '@omujs/chat';
    import { Header, Tooltip } from '@omujs/ui';
    import ConnectPageSetup from './_components/ConnectSetup.svelte';
    import PanelChannels from './_components/PanelChannels.svelte';
    import PanelMessages from './_components/PanelMessages.svelte';
    import PanelRooms from './_components/PanelRooms.svelte';

    let { data }: { data: unknown } = $props();

    let setupOpen = $state(false);

    omu.onReady(async () => {
        setupOpen = await chat.channels.size() == 0;

        chat.on(ChatEvents.Channel.Remove, async () => {
            setupOpen = await chat.channels.size() == 0;
        });
        chat.on(ChatEvents.Channel.Add, async () => {
            setupOpen = await chat.channels.size() == 0;
        });
    });
</script>

<Header icon="ti-bolt" title={$t('page.connect.title')} subtitle={$t('page.connect.tooltip')} />
<main>
    {#if setupOpen}
        <ConnectPageSetup cancel={() => setupOpen = false} />
    {:else}
        <div class="panels">
            <div class="left">
                <h3>
                    {$t('page.connect.channels')}
                    <i class="ti ti-user"></i>
                    <div class="actions">
                        <button onclick={() => setupOpen = true}>
                            <Tooltip>{$t('panels.channels.setup_channel')}</Tooltip>
                            {$t('panels.channels.append_channel')}
                            <i class="ti ti-user-share"></i>
                        </button>
                    </div>
                </h3>
                <div class="channels">
                    <PanelChannels />
                </div>
                <h3>
                    {$t('page.connect.rooms')}
                    <i class="ti ti-bolt"></i>
                </h3>
                <div class="rooms">
                    <PanelRooms openSetup={() => setupOpen = true} />
                </div>
            </div>
            <dir class="right">
                <h3>
                    {$t('page.connect.chat')}
                    <i class="ti ti-message"></i>
                </h3>
                <div class="chat">
                    <PanelMessages />
                </div>
            </dir>
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: relative;
        height: 100%;
        display: flex;
    }

    h3 {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        color: var(--color-1);
        font-size: 1rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        height: 2.25rem;
    }

    .actions {
        margin-left: auto;

        > button {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 0.25rem;
            padding: 0.4rem 1.5rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border: none;
            border-radius: 2px;
            font-size: 0.8rem;
            font-weight: 600;

            &:hover {
                background: var(--color-bg-2);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }

    .panels {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 6rem;
        display: flex;
        padding: 0.5rem 2rem;
        gap: 2rem;
    }

    $channel-height: clamp(15.5rem, 20vw, 19rem);

    .left {
        display: flex;
        flex-direction: column;
        width: 26rem;
        height: 100%;

        .channels {
            height: $channel-height;
            margin-bottom: 1rem;
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
        flex: 1;
        max-height: 100%;

        .chat {
            height: 100%;
            background: var(--color-bg-2);
        }
    }
</style>
