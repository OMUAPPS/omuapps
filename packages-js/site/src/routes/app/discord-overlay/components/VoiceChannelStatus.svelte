<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    const { selectedVoiceChannel } = overlayApp;

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
    }
</script>

{#if $selectedVoiceChannel}
    {@const { guild, channel } = $selectedVoiceChannel}
    <div class="server">
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
                    <img src={guild.icon_url} alt=""/>
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
        {/if}
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

<style lang="scss">
    .server {
        display: flex;
        align-items: center;
        margin-left: 0.5rem;
        color: var(--color-1);
        font-size: 0.9rem;
        border-bottom: 2px solid var(--color-1);
        height: 3rem;
        padding: 0.5rem 0;
        padding-top: 0rem;
        width: 100%;

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
</style>
