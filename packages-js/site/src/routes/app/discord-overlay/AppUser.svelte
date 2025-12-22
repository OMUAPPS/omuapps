<script lang="ts">

    import { comparator } from '$lib/helper';
    import { Vec2, type Vec2Like } from '$lib/math/vec2';
    import { omu, Popup, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import AvatarAdjustModal from './components/AvatarAdjustModal.svelte';
    import AvatarRenderer from './components/DiscordRenderer.svelte';
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

    const { config, world } = overlayApp;

    let resolution: Vec2Like = $state({ x: 0, y: 0 });

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = createUserConfig();
            $config.users[id] = user;
        }
        return user;
    }

    $effect(() => {
        for (const id of Object.keys(voiceState.states)) {
            getUser(id);
        }
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
</script>

<main>
    <div class="canvas" bind:clientWidth={resolution.x} bind:clientHeight={resolution.y}>
        <AvatarRenderer
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
            {#if resolution}
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
                    <p>逆光効果</p>
                    <small>注意！高GPU使用率</small>
                </Tooltip>
                <i class="ti ti-sun"></i>
            </button>
            <button onclick={() => {
                $config.effects.shadow.active = !$config.effects.shadow.active;
            }} class:active={$config.effects.shadow.active}>
                <Tooltip>
                    <p>アバターの影</p>
                    <small>影をつけて見やすくします</small>
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
            </button>
            <button onclick={() => {
                $config.effects.speech.active = !$config.effects.speech.active;
            }} class:active={$config.effects.speech.active}>
                <Tooltip>
                    <p>明るさ調整</p>
                    <small>喋ってないときに暗くなり、喋ると明るくなります</small>
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
            </button>
            <button onclick={() => {
                $config.show_name_tags = !$config.show_name_tags;
            }} class:active={$config.show_name_tags}>
                <Tooltip>
                    <p>名前を表示</p>
                </Tooltip>
                <i class="ti ti-label"></i>
            </button>
            <Popup>
                {#snippet children(open)}
                    <button onclick={(event) => {
                        open(event.currentTarget);
                    }} class="settings">
                        <Tooltip>
                            <p>
                                設定を開く
                            </p>
                        </Tooltip>
                        <i class="ti ti-settings"></i>
                    </button>
                {/snippet}
                {#snippet content()}
                    <VisualConfig {overlayApp} />
                {/snippet}
            </Popup>
            <button onclick={() => {
                $world.attahed = {};
                $world.objects = {};
            }} class="screenshot">
                <Tooltip>
                    <p>アイテムをすべて消す</p>
                </Tooltip>
                <i class="ti ti-x"></i>
            </button>
            <button onclick={takeScreenshot}>
                <Tooltip>
                    <p>撮影</p>
                </Tooltip>
                <i class="ti ti-camera"></i>
            </button>
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
        align-items: stretch;
        z-index: 1;
        margin: 1rem;
        margin-left: 24rem;
        animation: slide-in 0.0621s ease;

        > button {
            border: none;
            border-radius: 4rem;
            padding: 1rem;
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -2px;
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;

            &.active {
                background: var(--color-1);
                color: var(--color-bg-1);
            }

            &:hover {
                outline-offset: -3px;
            }

            > i {
                font-size: 1.25rem;
            }
        }

        > .settings {
            background: transparent;
            outline: none;
        }

        > .screenshot {
            margin-top: auto;
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
