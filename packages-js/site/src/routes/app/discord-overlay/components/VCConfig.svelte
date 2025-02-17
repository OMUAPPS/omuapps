<script lang="ts">

    import { Button, Combobox, Spinner, Tooltip } from '@omujs/ui';
    import type { AuthenticateUser, Channel, DiscordOverlayApp, Guild } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    export let clients: Record<string, AuthenticateUser>;
    export let guilds: Guild[];
    export let channels: Channel[];
    const { config } = overlayApp;

    $: hasUsers = Object.keys(clients).length > 0;
    $: hasGuilds = guilds.length > 0;
    $: hasChannels = channels.length > 0;

    async function refresh() {
        await overlayApp.refresh()
        clients = await overlayApp.getClients();
        console.log(clients);
    }
    $: guildOptions = {
        auto: {
            label: '自動',
            value: null,
        },
        ...Object.fromEntries(guilds.map((guild) => [guild.id, {label: guild.name, value: guild.id}]))
    }
    $: channelOptions = {
        auto: {
            label: '自動',
            value: null,
        },
        ...Object.fromEntries(channels.map((channel) => [channel.id, {label: channel.name, value: channel.id}]))
    }
</script>

<div class="config">
    <Button primary onclick={refresh} let:promise>
        {#if promise}
            再検出中…
            <Spinner />
        {:else if hasUsers}
            <Tooltip>
                Discordを再検出
            </Tooltip>
            ユーザーを再読み込み
            <i class="ti ti-reload"></i>
        {:else}
            <Tooltip>
                起動しているDiscordから読み込み直す
            </Tooltip>
            Discordを再検出
            <i class="ti ti-reload"></i>
        {/if}
    </Button>
    <span>
        {#if hasUsers && Object.keys(clients).length > 1}
            <p>
                <i class="ti ti-user"></i>
                ユーザー
            </p>
            <Combobox options={Object.fromEntries(Object.entries(clients).map(([id, client]) => [id, {label: client.global_name, value: id}]))} bind:value={$config.user_id}/>
        {:else if Object.keys(clients).length === 0}
            <small>
                起動しているDiscordが見つかりませんでした
            </small>
        {:else if $config.user_id}
            {@const user = clients[$config.user_id]}
            <p>
                <i class="ti ti-user"></i>
                ユーザー
            </p>
            {#if user.avatar}
                <img src="https://cdn.discordapp.com/avatars/{user.id}/{user.avatar}.png" alt="" class="avatar"/>
            {:else}
                <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" class="avatar"/>
            {/if}
            <small>
                {user.global_name}
            </small>
        {:else}
            <small>
                ユーザーを選択
            </small>
        {/if}
    </span>
    <span>
        {#if hasGuilds}
            <p>
                <i class="ti ti-server"></i>
                サーバー
            </p>
            <Combobox options={guildOptions} bind:value={$config.guild_id}/>
        {:else if hasUsers}
            <small>
                入っているサーバーは見つかりませんでした
            </small>
        {/if}
    </span>
    <span>
        {#if hasChannels}
            <p>
                <i class="ti ti-headphones"></i>
                チャンネル
            </p>
            <Combobox options={channelOptions} bind:value={$config.channel_id}/>
        {:else if hasGuilds && hasUsers && $config.guild_id}
            <small>
                ボイスチャンネルは見つかりませんでした
            </small>
        {/if}
    </span>
</div>

<h2>
    設定
    <i class="ti ti-settings"></i>
</h2>

<div class="config">
    <span>
        <p>
            <i class="ti ti-layout"></i>
            設定をリセット
        </p>
        <button on:click={() => {
            overlayApp.resetConfig();
            location.reload();
        }}>
            <Tooltip>
                設定を初期化して再読み込み
            </Tooltip>
            <i class="ti ti-trash"></i>
        </button>
    </span>
    <span>
        <p>
            <i class="ti ti-reload"></i>
            再読み込み
        </p>
        <button on:click={() => {
            location.reload();
        }}>
            <Tooltip>
                アプリを再読み込みする  
            </Tooltip>
            <i class="ti ti-reload"></i>
        </button>
    </span>
    <span>
        <label>
            <i class="ti ti-mountain"></i>
            Reactiveアバターを使う
            <input type="checkbox" bind:checked={$config.reactive.enabled} on:change={() => {
                window.location.reload();
            }}/>
        </label>
    </span>
</div>

<style lang="scss">
    .config {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
        padding-left: 0.5rem;

        > span {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            white-space: nowrap;

            > p {
                margin-right: auto;
                font-size: 0.8621rem;
            }

            > button {
                background: var(--color-bg-2);
                color: var(--color-1);
                border: none;
                outline: 1px solid var(--color-outline);
                outline-offset: -1px;
                width: 2rem;
                height: 2rem;
                border-radius: 2px;
                cursor: pointer;

                &:hover {
                    outline: 1px solid var(--color-1);
                    outline-offset: -1px;
                }

                &:disabled {
                    cursor: not-allowed;
                    background: var(--color-bg-1);
                }
            }
        }
    }

    .avatar {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 100%;
        margin-right: 0.25rem;
    }

    label {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 0.5rem;
        font-size: 0.8621rem;

        > input {
            width: 1.25rem;
            height: 1.25rem;
            accent-color: var(--color-1);
            margin-left: auto;

            &:hover {
                accent-color: var(--color-1);
            }
        }
    }

    small {
        font-size: 0.8rem;
        color: var(--color-text);
    }
</style>
