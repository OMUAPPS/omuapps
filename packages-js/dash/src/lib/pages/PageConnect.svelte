<script lang="ts">
    import { chat, omu, provider } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { ChatEvents } from '@omujs/chat';
    import { Header, Textbox, Tooltip } from '@omujs/ui';
    import ConnectPageSetup from './_components/ConnectSetup.svelte';
    import PanelChannels from './_components/PanelChannels.svelte';
    import PanelMessages from './_components/PanelMessages.svelte';
    import PanelRooms from './_components/PanelRooms.svelte';

    let { data: _data }: { data: unknown } = $props();

    let screen: 'chat' | 'start_from_url' | 'setup' | 'chat-clear' = $state('chat');

    omu.onReady(async () => {
        screen = await chat.channels.size() == 0 ? 'setup' : 'chat';

        chat.on(ChatEvents.Channel.Remove, async () => {
            screen = await chat.channels.size() == 0 ? 'setup' : 'chat';
        });
        chat.on(ChatEvents.Channel.Add, async () => {
            screen = await chat.channels.size() == 0 ? 'setup' : 'chat';
        });
    });

    let startURL = $state('');
</script>

<main>
    <Header icon="ti-bolt" title={$t('page.connect.title')} subtitle={$t('page.connect.tooltip')} />
    <div class="content">
        <div class="panels">
            <div class="left">
                <h3>
                    {$t('page.connect.channels')}
                    <i class="ti ti-user"></i>
                    <div class="actions">
                        <button onclick={() => screen = 'setup'}>
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
                    <div class="actions">
                        <button onclick={() => screen = 'start_from_url'}>
                            {$t('panels.channels.start_from_url')}
                            <i class="ti ti-link"></i>
                        </button>
                    </div>
                </h3>
                <div class="rooms">
                    <PanelRooms openSetup={() => screen = 'setup'} />
                </div>
            </div>
            <dir class="chat">
                <h3>
                    {$t('page.connect.chat')}
                    <i class="ti ti-message"></i>
                    <div class="actions">
                        <button onclick={() => screen = 'chat-clear'}>
                            <Tooltip>{$t('page.connect.clear_chat_tooltip')}</Tooltip>
                            {$t('page.connect.clear_chat')}
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                </h3>
                <div class="chat">
                    <PanelMessages />
                </div>
            </dir>
        </div>
        {#if screen === 'setup'}
            <div class="screen-container">
                <ConnectPageSetup cancel={() => screen = 'chat'} />
            </div>
        {:else if screen === 'start_from_url'}
            <div class="screen-container">
                <div class="screen">
                    <h1>URLから接続</h1>
                    <div class="url">
                        <Textbox bind:value={startURL} placeholder="youtu.be/..." />
                    </div>
                    <div class="actions">
                        <button onclick={() => screen = 'chat'}>
                            <Tooltip>{$t('page.connect.input_cancel')}</Tooltip>
                            {$t('page.connect.input_cancel')}
                            <i class="ti ti-chevron-left"></i>
                        </button>
                        <button onclick={() => {
                            provider.startFromUrl(startURL);
                            screen = 'chat';
                        }}>
                            <Tooltip>{$t('panels.channels.setup_channel')}</Tooltip>
                            {$t('panels.channels.append_channel')}
                            <i class="ti ti-user-share"></i>
                        </button>
                    </div>
                </div>
            </div>
        {:else if screen === 'chat-clear'}
            <div class="screen-container right">
                <div class="screen">
                    <h1>{$t('page.connect.clear_chat')}</h1>
                    <p>{$t('page.connect.clear_chat_tooltip')}</p>
                    <div class="actions">
                        <button onclick={() => screen = 'chat'}>
                            <Tooltip>{$t('page.connect.input_cancel')}</Tooltip>
                            {$t('page.connect.input_cancel')}
                            <i class="ti ti-chevron-left"></i>
                        </button>
                        <button onclick={() => {
                            chat.messages.clear();
                            screen = 'chat';
                        }}>
                            <Tooltip>{$t('page.connect.clear_chat_tooltip')}</Tooltip>
                            {$t('page.connect.clear_chat')}
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
    }

    .content {
        position: relative;
        flex: 1;
    }

    .screen-container {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 5rem;
        justify-content: center;
        background: linear-gradient(
            to right,
            color-mix(in srgb, var(--color-bg-1) 99%, transparent 0%) 40%,
            color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%) 100%
        );

        &.right {
            align-items: flex-end;
            justify-content: flex-start;
            background: linear-gradient(
                to left,
                color-mix(in srgb, var(--color-bg-1) 99%, transparent 0%) 40%,
                color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%) 100%
            );
        }
    }

    .screen {
        width: 24rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    h1 {
        font-size: 1.25rem;
        color: var(--color-1);
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
        display: flex;
        justify-content: space-between;
        margin-left: auto;
        gap: 1rem;

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
        inset: 0;
        display: flex;
        gap: 2rem;
        padding: 0.5rem 2rem;
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

    .chat {
        display: flex;
        flex-direction: column;
        flex: 1;

        .chat {
            height: 100%;
            background: var(--color-bg-2);
        }
    }
</style>
