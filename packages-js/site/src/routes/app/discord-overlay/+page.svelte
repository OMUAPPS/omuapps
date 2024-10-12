<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { AppHeader, Combobox, setClient, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import AvatarRenderer from './components/AvatarRenderer.svelte';
    import UserConfigEntry from './components/UserConfigEntry.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import { DiscordOverlayApp, DISCORDRPC_PERMISSIONS, type AuthenticateUser, type Channel, type Guild } from './discord-overlay-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const overlayApp = new DiscordOverlayApp(omu);
    const { voiceState, config } = overlayApp;
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            ...Object.values(DISCORDRPC_PERMISSIONS),
            ASSET_UPLOAD_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
            permissions.OBS_SOURCE_READ_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = {
                show: true,
                position: [0, 0],
                scale: 1,
                avatar: null,
            };
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

    omu.onReady(async () => {
        await overlayApp.waitForReady();
        clients = await overlayApp.getClients();
        state = null;
    })

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
        }
        const foundsGuild = guilds.find((guild) => guild.id === guild_id);
        const foundChannel = channels.find((channel) => channel.id === channel_id);
        if (user_id && guild_id && channel_id && foundsGuild && foundChannel) {
            state = 'connecting-vc';
            await overlayApp.setVC(user_id, channel_id);
            state = null;
        }
    }
    
    $: {
        if (!$config.user_id && clients) {
            $config.user_id = Object.keys(clients)[0];
        }
        const foundsGuild = guilds.find((guild) => guild.id === $config.guild_id);
        if (!foundsGuild || !$config.guild_id && guilds) {
            $config.guild_id = guilds[0]?.id;
        }
        const foundChannel = channels.find((channel) => channel.id === $config.channel_id);
        if (!foundChannel || !$config.channel_id && channels) {
            $config.channel_id = channels[0]?.id;
        }
        update($config.user_id, $config.guild_id, $config.channel_id);
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <div class="controls">
            <div class="config">
                <span>
                    {#if Object.keys(clients).length > 0}
                        <p>
                            ユーザー
                            <i class="ti ti-user"/>
                        </p>
                        <Combobox options={Object.fromEntries(Object.entries(clients).map(([id, client]) => [id, {label: client.global_name, value: id}]))} bind:value={$config.user_id}/>
                    {:else}
                        <p>
                            起動しているDiscordが見つかりませんでした…
                        </p>
                    {/if}
                </span>
                <span>
                    {#if guilds.length > 0}
                        <p>
                            サーバー
                            <i class="ti ti-server"/>
                        </p>
                        <Combobox options={Object.fromEntries(guilds.map((guild) => [guild.id, {label: guild.name, value: guild.id}]))} bind:value={$config.guild_id}/>
                    {/if}
                </span>
                <span>
                    {#if channels.length > 0}
                        <p>
                            チャンネル
                            <i class="ti ti-volume"/>
                        </p>
                        <Combobox options={Object.fromEntries(channels.map((channel) => [channel.id, {label: channel.name, value: channel.id}]))} bind:value={$config.channel_id}/>
                    {/if}
                </span>
            </div>
            <div class="users">
                {#if state === 'connecting-vc'}
                    <p>
                        ボイスチャンネルに接続中
                        <Spinner />
                    </p>
                {:else if state === 'wait-for-ready'}
                    <p>
                        Discordを待機中
                        <Spinner />
                    </p>
                {:else}
                    {#each Object.entries($voiceState) as [id, state] (id)}
                        <UserConfigEntry {overlayApp} {id} {state}/>
                    {:else}
                        <p>
                            まだ誰も居ないようです…
                            <i class="ti ti-user-off"/>
                        </p>
                        <small>誰かがボイスチャンネルに入ると表示されます</small>
                    {/each}
                {/if}
            </div>
            <h3>
                配信に追加
                <i class="ti ti-arrow-bar-to-down" />
            </h3>
            <AssetButton {omu} {obs} />
        </div>
        <div class="canvas" bind:clientWidth={dimentions.width} bind:clientHeight={dimentions.height}>
            <AvatarRenderer overlayApp={overlayApp} bind:message showGrid />
            <div class="avatar-controls">
                {#if dimentions}
                    {#each Object.entries($voiceState).filter(([id, ]) => $config.users[id]?.show) as [id, state] (id)}
                        <UserDragControl {dimentions} {overlayApp} {id} {state}/>
                    {/each}
                {/if}
            </div>
            <div class="camera-controls">
                <span class="zoom-level">
                    <i class="ti ti-zoom-in"/>
                    <input type="range" bind:value={$config.zoom_level} min={-2} max={2} step={0.01}/>
                    <i class="ti ti-zoom-out"/>
                </span>
            </div>
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
    </main>
</AppPage>

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
        flex-direction: row;
        margin: 1rem;
        gap: 1rem;
    }

    .canvas {
        position: relative;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid #e6e6e6;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
    }

    .config {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        > span {
            display: flex;
            gap: 1rem;
            align-items: center;
            justify-content: space-between;
            white-space: nowrap;
        }
    }

    .avatar-controls {
        position: absolute;
        inset: 0;
    }

    .camera-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;

        > .zoom-level {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
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

    .users {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0.5rem 0;
        background: var(--color-bg-2);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
        > p {
            text-align: center;
            font-weight: 600;
            font-size: 1rem;
            color: var(--color-1);
            margin-top: 2rem;
        }

        > small {
            text-align: center;
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--color-text);
        }
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
