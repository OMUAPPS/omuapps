<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Mat4 } from '$lib/math/mat4.js';
    import { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { Spinner, Tooltip } from '@omujs/ui';
    import AvatarAdjustModal from './components/AvatarAdjustModal.svelte';
    import AvatarRenderer from './components/AvatarRenderer.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import VCConfig from './components/VCConfig.svelte';
    import VisualConfig from './components/VisualConfig.svelte';
    import VoiceChannelStatus from './components/VoiceChannelStatus.svelte';
    import { createUserConfig, DiscordOverlayApp, type AuthenticateUser, type Channel, type Guild } from './discord-overlay-app.js';
    import { dragUser, heldUser, selectedAvatar } from './states.js';

    export let omu: Omu;
    export let obs: OBSPlugin;
    export let overlayApp: DiscordOverlayApp;
    const { voiceState, config } = overlayApp;
    
    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = createUserConfig();
            $config.users[id] = user;
        }
        return user;
    }

    $: Object.keys($voiceState).forEach(id => {
        getUser(id);
    });

    let message: {type: 'loading'| 'failed', text: string} | null = null;
    let dimentions: {width: number, height: number} = {width: 0, height: 0};

    let state: 'wait-for-ready' | 'connecting-vc' | null = 'wait-for-ready';
    let clients: Record<string, AuthenticateUser> = {};
    let guilds: Guild[] = [];
    let channels: Channel[] = [];
    let ready = false;

    omu.onReady(async () => {
        await overlayApp.waitForReady();
        clients = await overlayApp.getClients();
        state = null;
        ready = true;
        config.update((config) => overlayApp.migrateConfig(config));
    });

    let last_user_id: string | null = null;
    let last_guild_id: string | null = null;
    let last_channel_id: string | null = null;
    async function update(user_id: string | null, guild_id: string | null, channel_id: string | null) {
        if (user_id === last_user_id && guild_id === last_guild_id && channel_id === last_channel_id) {
            return;
        }
        last_user_id = user_id;
        last_guild_id = guild_id;
        last_channel_id = channel_id;
        if (user_id) {
            guilds = (await overlayApp.getGuilds(user_id)).guilds;
        }
        if (user_id && guild_id) {
            channels = (await overlayApp.getChannels(user_id, guild_id)).channels.filter((channel) => channel.type === 2);
        } else {
            channels = [];
        }
        if (user_id) {
            state = 'connecting-vc';
            await overlayApp.setVC({
                user_id,
                guild_id,
                channel_id,
            });
            state = null;
        }
    }
    
    $: {
        const userFound = $config.user_id && clients[$config.user_id] || null;
        if (Object.keys(clients).length > 0 && !userFound) {
            $config.user_id = Object.keys(clients)[0];
        }
        if ($config.user_id && clients[$config.user_id]) {
            update($config.user_id, $config.guild_id, $config.channel_id);
        }
    }

    let tab: 'visual' | 'config' | null = null;
    let view: Mat4 = Mat4.IDENTITY;
    $: {
        if ($selectedAvatar || $heldUser || $dragUser) {
            tab = null;
        }
    }
</script>

<main>
    {#if ready}
        <div class="canvas" bind:clientWidth={dimentions.width} bind:clientHeight={dimentions.height}>
            <AvatarRenderer overlayApp={overlayApp} bind:message bind:view showGrid />
            {#if $selectedAvatar}
                <AvatarAdjustModal overlayApp={overlayApp} />
            {:else}
                {#if dimentions && view}
                    {#each Object.entries($voiceState)
                        .sort(([a,], [b,]) => $config.users[a].position[0] - $config.users[b].position[0]) as [id, state] (id)}
                        <UserDragControl {view} {dimentions} {overlayApp} {id} {state}/>
                    {/each}
                {/if}
            {/if}
            {#if !$dragUser && !$selectedAvatar}
                <div class="actions">
                    <label>
                        自動で整列
                        <input type="checkbox" bind:checked={$config.align.auto} />
                    </label>
                </div>
            {/if}
            {#if message}
                <div class="message">
                    {#if message.type === 'loading'}
                        <p>
                            {message.text}
                            <Spinner />
                        </p>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
    {#if !$dragUser && !$selectedAvatar}
        <div class="menu">
            <VoiceChannelStatus {overlayApp} {state} />
            <div class="tabs">
                <button class:active={tab === 'config'} on:click={() => (tab = tab === 'config' ? null : 'config')}>
                    <Tooltip>
                        {#if $config.user_id && clients[$config.user_id]}
                            {@const user = clients[$config.user_id]}
                            <div class="logged-user">
                                {#if user.avatar}
                                    <img src="https://cdn.discordapp.com/avatars/{user.id}/{user.avatar}.png" alt="" class="avatar"/>
                                {:else}
                                    <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" class="avatar"/>
                                {/if}
                                <span>{user.global_name}</span>
                                <small>にログイン中</small>
                            </div>
                        {:else}
                            ユーザーを選択
                        {/if}
                    </Tooltip>
                    <i class="ti ti-settings"></i>
                    設定
                </button>
                <button class:active={tab === 'visual'} on:click={() => (tab = tab === 'visual' ? null : 'visual')}>
                    <i class="ti ti-eye-check"></i>
                    見た目を調整
                </button>
            </div>
            {#if tab}
                <div class="tab">
                    {#if tab === 'config'}
                        <h3>
                            接続設定
                            <i class="ti ti-user"></i>
                        </h3>
                        <VCConfig {overlayApp} bind:clients bind:guilds bind:channels />
                    {:else if tab === 'visual'}
                        <VisualConfig {overlayApp} />
                    {/if}
                </div>
            {/if}
            <h3 style="margin-top: auto;">
                配信ソフトに追加する
                <i class="ti ti-arrow-bar-to-down"></i>
            </h3>
            <section>
                <AssetButton {omu} {obs} dimensions={{width: 1920, height: 1080}} />
            </section>
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

    .actions {
        position: absolute;
        bottom: 1rem;
        right: 16rem;
        display: flex;
        gap: 1rem;

        > label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            font-size: 1rem;
            color: var(--color-1);
            cursor: pointer;

            > input {
                width: 1.25rem;
                height: 1.25rem;
                cursor: pointer;
                border: 1px solid var(--color-outline);
                border-radius: 2px;
                accent-color: var(--color-1);
                outline: none;
                cursor: pointer;

                &:checked {
                    background: var(--color-1);
                }
            }
        }
    }

    .menu {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        z-index: 1;
        width: 20rem;
        margin: 1rem;
    }

    .tab {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 0.5rem;
        padding: 2rem 0.75rem;
        padding-top: 1rem;
        overflow-y: auto;
        max-height: fit-content;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);

        > h3 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
            color: var(--color-1);
            border-bottom: 1px solid var(--color-outline);
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
        }
    }

    .tabs {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 0.25rem;
        
        > button {
            background: var(--color-bg-2);
            color: var(--color-1);
            border: none;
            padding: 0.5rem 1rem;
            width: 100%;
            border-radius: 2px;
            white-space: nowrap;
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            align-items: baseline;
            justify-content: start;
            gap: 0.5rem;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-2);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }

            &.active {
                background: var(--color-1);
                color: var(--color-bg-2);
            }
        }
    }

    .logged-user {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem;

        > .avatar {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 100%;
        }
    }

    .message {
        position: absolute;
        top: 10rem;
        padding: 0.5rem 2rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: 600;
        font-size: 1rem;
    }
</style>
