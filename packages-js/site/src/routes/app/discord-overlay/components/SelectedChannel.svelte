<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    const { selectedVoiceChannel, voiceState } = overlayApp;
</script>

{#if $selectedVoiceChannel}
    {@const guild = $selectedVoiceChannel.guild}
    {@const channel = $selectedVoiceChannel.channel}
    <div class="selected">
        {#if guild}
            {#if guild.icon_url}
                <img src={guild.icon_url} alt="" class="icon">
            {:else}
                <div class="icon">
                    <i class="ti ti-server"></i>
                </div>
            {/if}
            <p>{guild.name}</p>
            <i class="ti ti-slash"></i>
            <span>
                {#if channel.guild_id}
                    {channel.name}
                {/if}
            </span>
        {:else}
            <div class="icon">
                {#if channel.type === 3}
                    <i class="ti ti-users-group"></i>
                {:else if channel.type === 1}
                    <i class="ti ti-users"></i>
                {:else}
                    <i class="ti ti-server"></i>
                {/if}
            </div>
            <p>
                {#if channel.type === 3}
                    グループ通話
                {:else}
                    個人通話
                {/if}
            </p>
        {/if}
        {#if channel.user_limit}
            <span class="limit">
                <Tooltip>
                    {channel.user_limit}人まで
                </Tooltip>
                <span class="current">
                    {Object.keys($voiceState).length}
                </span>
                <i class="ti ti-slash"></i>
                <span class="max">
                    {channel.user_limit}
                </span>
            </span>
        {/if}
    </div>
{:else}
    <div class="selected">
        <div class="icon">
            <i class="ti ti-user-off"></i>
        </div>
        <p>通話していません</p>
    </div>
{/if}


<style lang="scss">
    .selected {
        display: flex;
        border-radius: 2px;
        font-size: 0.8rem;
        align-items: center;
        margin-left: 0.25rem;
        padding-bottom: 0.25rem;

        > .icon {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            overflow: hidden;
            background: var(--color-bg-1);
            margin-right: 0.75rem;
            display: flex;
            justify-content: center;
            align-items: center;

            > i {
                font-size: 1.2rem;
                color: var(--color-1);
            }
        }

        > p {
            font-weight: 600;
        }

        > i {
            margin: 0 0.25rem;
        }

        > span {
            color: var(--color-text);
        }

        > .limit {
            margin-left: auto;
            padding: 0.25rem 0.5rem;
            border-radius: 999px;
            font-size: 0.621rem;
            color: var(--color-1);
        }
    }
</style>
