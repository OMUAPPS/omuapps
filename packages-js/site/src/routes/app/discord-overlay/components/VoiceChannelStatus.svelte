<script lang="ts">
    import { Button, Spinner, TableList, Tooltip } from '@omujs/ui';
    import { DiscordOverlayApp } from '../discord-overlay-app.js';
    import type { RPCSession } from '../discord/discord.js';

    let vcState: 'wait-for-ready' | 'connecting-vc' | null = null;
    interface Props {
        session: RPCSession;
    }

    let { session }: Props = $props();

    const CHANNEL_TYPE = {
        GUILD_TEXT: 0,
        DM: 1,
        GUILD_VOICE: 2,
        GROUP_DM: 3,
        GUILD_CATEGORY: 4,
        GUILD_ANNOUNCEMENT: 5,
        ANNOUNCEMENT_THREAD: 10,
        PUBLIC_THREAD: 11,
        PRIVATE_THREAD: 12,
        GUILD_STAGE_VOICE: 13,
        GUILD_DIRECTORY: 14,
        GUILD_FORUM: 15,
        GUILD_MEDIA: 16,
    };

    const { channelConfigs, config, world } = DiscordOverlayApp.getInstance();

    let open = $state(false);
</script>

{#if session.selected_voice_channel && !vcState}
    {@const { guild, channel } = session.selected_voice_channel}
    {#if open}
        <h4>
            過去の設定
            <div class="actions">
                <Button onclick={() => {
                    channelConfigs.add({
                        channel_id: channel.id,
                        channel,
                        guild,
                        version: 0,
                        config: $config,
                        world: $world,
                    });
                }} primary>
                    <Tooltip>
                        位置やサイズなどの設定を保存します
                    </Tooltip>
                    保存
                    <i class="ti ti-upload"></i>
                </Button>
            </div>
        </h4>
        <div class="config-list">
            <TableList table={channelConfigs}>
                {#snippet component({ entry })}
                    {@const guildName = {
                        [CHANNEL_TYPE.DM]: 'DM',
                        [CHANNEL_TYPE.GROUP_DM]: 'Group DM',
                    }[entry.channel.type] || entry.guild?.name || 'Unknown'}
                    {@const channelName = {
                        [CHANNEL_TYPE.DM]: null,
                        [CHANNEL_TYPE.GROUP_DM]: null,
                    }[entry.channel.type] || entry.channel.name}
                    <div class="item">
                        <div class="name">
                            <small>{guildName}</small>
                            <p>{channelName}</p>
                        </div>
                        <div class="actions">
                            <button onclick={() => {
                                channelConfigs.remove(entry);
                            }}>
                                <Tooltip>
                                    このチャンネルの設定を削除します
                                </Tooltip>
                                <i class="ti ti-trash"></i>
                            </button>
                            <button onclick={() => {
                                DiscordOverlayApp.getInstance().applyChannelConfig(entry);
                            }}>
                                <Tooltip>
                                    このチャンネルの設定を現在の設定に適用します
                                </Tooltip>
                                <i class="ti ti-check"></i>
                            </button>
                        </div>
                    </div>
                {/snippet}
            </TableList>
        </div>
    {/if}
    <button class="server" onclick={() => open = !open}>
        {#if channel}
            {@const guildName = {
                [CHANNEL_TYPE.DM]: 'DM',
                [CHANNEL_TYPE.GROUP_DM]: 'Group DM',
            }[channel.type] || guild?.name || 'Unknown'}
            {@const channelName = {
                [CHANNEL_TYPE.DM]: null,
                [CHANNEL_TYPE.GROUP_DM]: null,
            }[channel.type] || channel.name}
            <Tooltip>
                <b>{guildName}</b>
                {#if channelName}
                    <i class="ti ti-slash"></i>
                    <b>{channelName}</b>
                {/if}
                <small>に</small>接続中
            </Tooltip>
            <div class="icon">
                {#if guild?.icon_url}
                    <img src={guild.icon_url} alt="" />
                {:else if channel.type === CHANNEL_TYPE.DM}
                    <i class="ti ti-user"></i>
                {:else if channel.type === CHANNEL_TYPE.GROUP_DM}
                    <i class="ti ti-users"></i>
                {:else}
                    <i class="ti ti-server"></i>
                {/if}
            </div>
            <p>
                <span class="guild">{guildName}</span>
                {#if channelName}
                    <i class="ti ti-slash"></i>
                    <span class="channel">{channelName}</span>
                {/if}
                {#if channel.user_limit}
                    <span class="limit">
                        <Tooltip>
                            {channel.voice_states ? Object.keys(channel.voice_states).length : 0}
                            <i class="ti ti-slash"></i>
                            {channel.user_limit}人まで
                        </Tooltip>
                        {channel.voice_states ? Object.keys(channel.voice_states).length : 0}
                        <i class="ti ti-slash"></i>
                        {channel.user_limit}
                    </span>
                {/if}
            </p>
            <div class="open">
                {#if open}
                    <i class="ti ti-dots-vertical"></i>
                {:else}
                    <i class="ti ti-chevron-down"></i>
                {/if}
            </div>
        {/if}
    </button>
{:else}
    {#if vcState === 'connecting-vc'}
        <div class="server">
            <Tooltip>
                {#if session.selected_voice_channel}
                    {#if session.selected_voice_channel.guild}
                        {session.selected_voice_channel.guild.name}の
                    {/if}
                    {session.selected_voice_channel.channel.name}に接続しています
                {:else}
                    現在入っている通話に接続しています
                {/if}
            </Tooltip>
            <div class="icon">
                <i class="ti ti-server"></i>
            </div>
            <p>
                ボイスチャンネルに接続中
                <Spinner />
            </p>
        </div>
    {:else if vcState === 'wait-for-ready'}
        <div class="server">
            <Tooltip>
                起動しているDiscordを検出しています
            </Tooltip>
            <div class="icon">
                <i class="ti ti-search"></i>
            </div>
            <p>
                Discordを待機中
                <Spinner />
            </p>
        </div>
    {:else}
        <div class="server">
            <Tooltip>
                ボイスチャンネルに接続していません
            </Tooltip>
            <div class="icon">
                <i class="ti ti-server"></i>
            </div>
            <p>
                接続していません
            </p>
        </div>
    {/if}
{/if}

<style lang="scss">
    h4 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
    }

    .config-list {
        height: 20rem;
        background: var(--color-bg-2);

        .item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            height: 3rem;
            padding-left: 0.5rem;

            &:hover {
                background: var(--color-bg-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }

            .name {
                font-weight: 600;
                color: var(--color-1);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0.5rem;

                > p {
                    font-size: 0.9rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                > small {
                    font-size: 0.7rem;
                    color: var(--color-1);
                }
            }

            .actions {
                display: flex;
                align-items: center;

                button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    color: var(--color-1);
                    cursor: pointer;
                    height: 3rem;
                    width: 3rem;

                    &:hover {
                        background: var(--color-1);
                        color: var(--color-bg-1);
                    }
                }
            }
        }
    }

    .server {
        display: flex;
        align-items: center;
        color: var(--color-1);
        font-size: 0.9rem;
        height: 3rem;
        padding: 0.5rem 0;
        padding-top: 0rem;
        width: 100%;
        cursor: pointer;
        background: none;
        border: none;
        border-bottom: 2px solid var(--color-1);

        > .icon {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 100%;
            object-fit: cover;
            width: 2rem;
            height: 2rem;
            margin-right: 0.5rem;
            background: var(--color-bg-2);

            > img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 100%;
            }

            > i {
                font-size: 1rem;
                color: var(--color-1);
            }
        }

        > p {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            font-weight: 600;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 14rem;

            > span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            > .limit {
                font-weight: 600;
                font-size: 0.7rem;
                display: flex;
                align-items: baseline;
                background: var(--color-bg-2);
                border-radius: 621px;
                color: var(--color-1);
                padding: 0.25rem 0.5rem;
                margin-left: 0.5rem;
            }
        }
    }

    .open {
        margin-left: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
        color: var(--color-1);
        margin-right: 1rem;
    }
</style>
