<script lang="ts">
    import { run } from 'svelte/legacy';

    import { comparator } from '$lib/helper';
    import { Slider, Tooltip } from '@omujs/ui';
    import AvatarAdjustModal from './components/AvatarAdjustModal.svelte';
    import AvatarRenderer from './components/AvatarRenderer.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import VisualConfig from './components/VisualConfig.svelte';
    import { createUserConfig, DiscordOverlayApp } from './discord-overlay-app.js';
    import type { RPCSession, RPCSpeakingStates, RPCVoiceStates } from './discord/discord';
    import { dragState, selectedAvatar } from './states.js';

    interface Props {
        session: RPCSession;
        voiceState: RPCVoiceStates;
        speakingState: RPCSpeakingStates;
        overlayApp: DiscordOverlayApp;
    }

    let {
        session,
        voiceState,
        speakingState,
        overlayApp,
    }: Props = $props();
    const { config } = overlayApp;

    let resolution: { width: number; height: number } = $state({ width: 0, height: 0 });

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = createUserConfig();
            $config.users[id] = user;
        }
        return user;
    }

    run(() => {
        Object.keys(voiceState.states).forEach(id => {
            getUser(id);
        });
    });

    let settingsOpen = $state(false);
</script>

<main>
    <div class="canvas" bind:clientWidth={resolution.width} bind:clientHeight={resolution.height}>
        <AvatarRenderer
            overlayApp={overlayApp}
            {voiceState}
            {speakingState}
        />
        {#if $selectedAvatar && $config.avatars[$selectedAvatar]}
            <AvatarAdjustModal
                overlayApp={overlayApp}
                bind:avatarConfig={$config.avatars[$selectedAvatar]}
                {voiceState}
                {speakingState}
            />
        {:else}
            {#if resolution}
                {#each Object.entries(voiceState.states)
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
        <div class="config">
            <button onclick={() => {
                $config.effects.backlightEffect.active = !$config.effects.backlightEffect.active;
            }} class:active={$config.effects.backlightEffect.active}>
                <Tooltip>
                    注意！高GPU使用率
                </Tooltip>
                <i class="ti ti-sun"></i>
                逆光効果
            </button>
            <button onclick={() => {
                $config.effects.shadow.active = !$config.effects.shadow.active;
            }} class:active={$config.effects.shadow.active}>
                <Tooltip>
                    影をつけて見やすくします
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
                アバターの影
            </button>
            <button onclick={() => {
                $config.effects.speech.active = !$config.effects.speech.active;
            }} class:active={$config.effects.speech.active}>
                <Tooltip>
                    喋ってないときに暗くなり、喋ると明るくなります
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
                明るさ調整
            </button>
            <button onclick={() => {
                $config.show_name_tags = !$config.show_name_tags;
            }} class:active={$config.show_name_tags}>
                <i class="ti ti-label"></i>
                名前を表示
            </button>
        </div>
        <div class="settings">
            <button onclick={() => {settingsOpen = !settingsOpen;}}>
                <i class="ti ti-settings"></i>
                詳細設定
                {#if settingsOpen}
                    <i class="ti ti-chevron-up"></i>
                {:else}
                    <i class="ti ti-chevron-down"></i>
                {/if}
            </button>
            {#if settingsOpen}
                <VisualConfig {overlayApp} />
            {/if}
            <Slider bind:value={$config.align.margin} min={0} max={100} step={1} />
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

    .canvas {
        position: absolute;
        inset: 0;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid var(--color-outline);
    }

    .config {
        position: absolute;
        top: 0;
        right: 0;
        left: auto;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        align-items: stretch;
        z-index: 1;
        margin: 1rem;
        margin-left: 24rem;
        animation: slide-in 0.0621s ease;

        > button {
            border: none;
            padding: 0.5rem 0.75rem;
            font-size: 0.9rem;
            font-weight: 600;
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            cursor: pointer;
            border-radius: 2px;
            white-space: nowrap;

            > i {
                margin-right: 0.25rem;
            }

            &.active {
                background: var(--color-1);
                color: var(--color-bg-1);
            }
        }
    }

    .settings {
        position: absolute;
        top: 5rem;
        right: 0;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        width: 20rem;
        flex-direction: column;
        align-items: flex-end;
        z-index: 1;
        margin: 1rem;
        animation: slide-in 0.0621s ease;

        > button {
            border: none;
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            background: var(--color-1);
            color: var(--color-bg-1);
            cursor: pointer;
            border-radius: 2px;
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
