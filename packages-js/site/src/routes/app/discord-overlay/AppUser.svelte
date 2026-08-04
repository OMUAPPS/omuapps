<script lang="ts">

    import { comparator } from '$lib/helper';
    import { Vec2, type Vec2Like } from '$lib/math/vec2';
    import { omu, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import AvatarAdjustModal from './components/AvatarAdjustModal.svelte';
    import DiscordRenderer from './components/DiscordRenderer.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import VisualConfig from './components/VisualConfig.svelte';
    import { createUserConfig, DiscordOverlayApp } from './discord-overlay-app.js';
    import type { RPCSpeakingStates, RPCVoiceStates } from './discord/discord';
    import { dragState, selectedAvatar } from './states.js';

    interface Props {
        voiceState: RPCVoiceStates;
        speakingState: RPCSpeakingStates;
        overlayApp: DiscordOverlayApp;
    }

    let {
        voiceState,
        speakingState,
        overlayApp,
    }: Props = $props();

    const { channelConfigs, config, world, discord } = overlayApp;
    const { sessions } = discord;
    let session = $derived(Object.entries($sessions).find(([, session]) => session.user.id === $config.user_id)?.[1]);

    let resolution: Vec2Like = $state({ x: 0, y: 0 });

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = createUserConfig();
            user.scale = $config.align.default_scale;
            $config.users[id] = user;
        }
        return user;
    }

    $effect(() => {
        for (const id of Object.keys(voiceState.states)) {
            getUser(id);
        }
    });
    let lastChannelId: string | undefined = $state();
    $effect(() => {
        const id = session?.selected_voice_channel?.channel.id;
        if (id === lastChannelId) {
            return;
        }
        lastChannelId = id;
        if (!id) {
            return;
        }
        channelConfigs.get(id).then((existingConfig) => {
            if (!existingConfig) {
                return;
            }
            overlayApp.applyChannelConfig(existingConfig);
        });
    });
    $effect(() => {
        const vc = session?.selected_voice_channel;
        if (!vc) {
            return;
        }
        const currentConfig = $config;
        const currentWorld = $world;
        channelConfigs.has(vc.channel.id).then((exists) => {
            if (exists) {
                channelConfigs.update({
                    channel: vc.channel,
                    channel_id: vc.channel.id,
                    guild: vc.guild,
                    config: currentConfig,
                    world: currentWorld,
                    version: 0,
                });
            }
        });
    });
    let takeScreenshot: () => Promise<void> = $state(async () => {});

    onMount(async () => {
        const dragDrop = await $omu.dashboard.requestDragDrop();
        dragDrop.onDrop(async (event) => {
            const files = await dragDrop.read(event.drag_id);
            for (const file of Object.values(files.files)) {
                const id = Date.now().toString(36);
                const source = await overlayApp.uploadSource(file.buffer.buffer as ArrayBuffer);
                $world.objects[id] = {
                    id,
                    position: Vec2.ZERO,
                    scale: 1,
                    source,
                };
            }
        });
    });

    let isSettingsOpen = $state(false);
</script>

<main>
    <div class="canvas" bind:clientWidth={resolution.x} bind:clientHeight={resolution.y}>
        <DiscordRenderer
            overlayApp={overlayApp}
            {voiceState}
            {speakingState}
            bind:takeScreenshot
        />
        {#if $selectedAvatar && $config.avatars[$selectedAvatar]}
            <AvatarAdjustModal
                overlayApp={overlayApp}
                bind:avatarConfig={$config.avatars[$selectedAvatar]}
                {voiceState}
                {speakingState}
            />
        {:else}
            {#if resolution && (!$dragState || $dragState.type === 'user')}
                {#each Object.entries(voiceState.states)
                    .filter(([id]) => $config.users[id])
                    .sort(comparator(([id]) => {
                        const user = $config.users[id];
                        return user.lastDraggedAt;
                    })) as [id, state] (id)}
                    {#if state}
                        <UserDragControl
                            {resolution}
                            {overlayApp}
                            voiceStates={voiceState}
                            {id}
                            voiceState={state}
                            bind:user={$config.users[id]}
                        />
                    {/if}
                {/each}
            {/if}
        {/if}
    </div>
    {#if !$dragState && !$selectedAvatar}
        <div class="effects">
            <button onclick={() => {
                $config.effects.backlightEffect.active = !$config.effects.backlightEffect.active;
            }} class:active={$config.effects.backlightEffect.active}>
                <Tooltip>
                    <small>注意！高GPU使用率</small>
                </Tooltip>
                <p>逆光効果</p>
                <i class="ti ti-sun"></i>
            </button>
            <button onclick={() => {
                $config.effects.shadow.active = !$config.effects.shadow.active;
            }} class:active={$config.effects.shadow.active}>
                <Tooltip>
                    <small>影をつけて見やすくします</small>
                </Tooltip>
                <p>アバターの影</p>
                <i class="ti ti-ghost-3"></i>
            </button>
            <button onclick={() => {
                $config.effects.speech.active = !$config.effects.speech.active;
            }} class:active={$config.effects.speech.active}>
                <Tooltip>
                    <small>喋ってないときに暗くなり、喋ると明るくなります</small>
                </Tooltip>
                <p>明るさ調整</p>
                <i class="ti ti-ghost-3"></i>
            </button>
            <button onclick={() => {
                $config.show_name_tags = !$config.show_name_tags;
            }} class:active={$config.show_name_tags}>
                <p>名前を表示</p>
                <i class="ti ti-label"></i>
            </button>
            <button class:active={isSettingsOpen} class="setting-expand" onclick={() => {
                isSettingsOpen = !isSettingsOpen;
            }}>
                詳細設定
                {#if isSettingsOpen}
                    <i class="ti ti-chevron-up"></i>
                {:else}
                    <i class="ti ti-chevron-down"></i>
                {/if}
            </button>
            {#if isSettingsOpen}
                <div class="settings omu-scroll">
                    <VisualConfig {overlayApp} />
                </div>
            {:else}
                <hr>
                <button onclick={takeScreenshot}>
                    <p>スクリーンショット</p>
                    <i class="ti ti-camera"></i>
                </button>
                <button onclick={() => {
                    $world.attahed = {};
                    $world.objects = {};
                }}>
                    <p>アイテムをすべて消す</p>
                    <i class="ti ti-photo-x"></i>
                </button>
            {/if}
        </div>
    {/if}
    {#if Object.keys(voiceState.states).length === 0}
        <div class="overlay">
            <h2>
                通話をはじめましょう！
            </h2>
            <p>
                Discordの通話に参加するとここに自分と通話相手のアバターが表示されます。
            </p>
            {#if session?.user.global_name}
                {@const avatarUrl = session.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                <div class="user">
                    <img src={avatarUrl} alt="">
                    <b>{session.user.global_name}</b>
                    <small>にログインしています</small>
                </div>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        background: var(--color-bg-1);
        text-align: center;

        > h2 {
            font-size: 1.5rem;
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
            border-bottom: 1px solid var(--color-1);
        }

        > .user {
            margin-top: 2rem;
            color: var(--color-text);
            display: flex;
            align-items: center;
            gap: 0.5rem;

            > img {
                width: 1.5rem;
                height: 1.5rem;
                border-radius: 9999px;
            }
        }
    }

    .canvas {
        position: absolute;
        inset: 0;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid var(--color-outline);
    }

    .effects {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: auto;
        gap: 0.75rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        z-index: 1;
        margin: 1rem;
        margin-left: 24rem;
        animation: slide-in 0.0621s ease;

        > hr {
            margin-top: auto;
            margin-bottom: 1rem;
            width: 100%;
            height: 1px;
            background: var(--color-outline);
            border: none;
        }

        > button {
            border: none;
            border-radius: 4rem;
            padding: 0.75rem 1rem;
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -2px;
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.85rem;
            font-weight: 600;
            gap: 0.5rem;
            width: 13rem;

            &.active {
                background: var(--color-1);
                color: var(--color-bg-1);
            }

            &:hover {
                outline-offset: -3px;
            }

            > p {
                margin-left: 0.5rem;
            }

            > i {
                font-size: 1.25rem;
            }
        }

        > .setting-expand {
            background: transparent;
            outline: none;
        }

        > .settings {
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
            border-radius: 6px;
            padding: 1rem;
            margin-top: auto;
            width: 30rem;
            height: min(30rem, calc(100% - 10rem));
            overflow: auto;
            z-index: 4;
        }
    }

    @keyframes slide-in {
        from {
            transform: translateX(-0.5rem);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
</style>
