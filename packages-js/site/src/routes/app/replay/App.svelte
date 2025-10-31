<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import type { Chat } from '@omujs/chat';
    import { OBSPlugin } from '@omujs/obs';
    import { Button, TableList, Textbox, Tooltip } from '@omujs/ui';
    import { ASSET_APP } from './app';
    import Config from './components/Config.svelte';
    import Menu from './components/Menu.svelte';
    import MenuSection from './components/MenuSection.svelte';
    import TwitchPlayer from './components/player/TwitchPlayer.svelte';
    import YoutubePlayer from './components/player/YoutubePlayer.svelte';
    import RoomEntry from './components/RoomEntry.svelte';
    import { ReplayApp } from './replay-app.js';

    export let obs: OBSPlugin;
    export let chat: Chat;

    const replay = ReplayApp.getInstance();
    const { replayData, config, omu } = replay;

    let search: string = '';

    let showConfig = false;
</script>

<div class="container">
    <Menu>
        <Button
            onclick={() => {
                showConfig = true;
            }}
            primary
        >
            設定
            <i class="ti ti-settings"></i>
        </Button>
        <MenuSection name="最近の配信から" icon="ti-video" flex={1}>
            <div class="search" slot="actions">
                <Tooltip>過去の配信から検索</Tooltip>
                <input type="search" bind:value={search} placeholder="検索" />
                {#if !search}
                    <i class="ti ti-search"></i>
                {/if}
            </div>
            <TableList
                table={chat.rooms}
                component={RoomEntry}
                filter={(_, room) => {
                    if (!room.metadata?.url) return false;
                    if (
                        search &&
                        room.metadata.title
                            ?.toLowerCase()
                            .includes(search.toLowerCase())
                    ) {
                        return false;
                    }
                    return true;
                }}
            >
                <p slot="empty" class="no-streams">
                    配信が追加されるとここに表示されます
                </p>
            </TableList>
        </MenuSection>
        <MenuSection name="配信ソフトに追加する" icon="ti-arrow-bar-to-down">
            <AssetButton
                asset={ASSET_APP}
                dimensions={{ width: '50:%', height: '50:%' }}
                {omu}
                {obs}
            />
        </MenuSection>
        <MenuSection name="OBSの音" icon="ti ti-volume">
            <Button primary onclick={() => {
                $config.muted = !$config.muted;
            }}>
                {#if $config.muted}
                    <i class="ti ti-volume-2"></i>
                    ミュート解除
                {:else}
                    <i class="ti ti-volume-3"></i>
                    ミュート
                {/if}
            </Button>
        </MenuSection>
    </Menu>
    <div class="content">
        <div class="player">
            {#if $replayData}
                {#if $replayData.video.type === 'youtube'}
                    <YoutubePlayer
                        video={$replayData.video}
                        bind:playback={$replayData.playback}
                        bind:info={$replayData.info}
                    />
                {:else if $replayData.video.type === 'twitch'}
                    <TwitchPlayer
                        video={$replayData.video}
                        bind:playback={$replayData.playback}
                        bind:info={$replayData.info}
                    />
                {/if}
            {:else}
                <div class="empty">
                    動画を選択するとここに表示されます
                    <i class="ti ti-video"></i>
                </div>
            {/if}
        </div>
        <MenuSection name="URLから" icon="ti-link">
            <Textbox
                placeholder="https://youtu.be/..."
                on:input={(event) => {
                    const url = new URL(event.detail);
                    replay.playByUrl(url);
                }}
                lazy
            />
        </MenuSection>
    </div>
</div>
{#if showConfig}
    <Config bind:showConfig />
{/if}

<style lang="scss">
    .container {
        display: flex;
        gap: 2rem;
        flex: 1;
    }

    .search {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--color-1);
        margin-left: 1rem;

        > input {
            width: 100%;
            border: none;
            background: none;
            color: var(--color-1);
            font-size: 1rem;
            padding: 0.25rem 0.1rem;

            &::placeholder {
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--color-1);
            }

            &:focus {
                outline: none;
            }
        }

        > .ti-search {
            position: absolute;
            right: 0;
            font-size: 0.8rem;
            margin-right: 0.5rem;
            pointer-events: none;
        }
    }

    .no-streams {
        color: var(--color-text);
        background: var(--color-bg-2);
        font-size: 0.8rem;
        opacity: 0.621;
        height: 4rem;
        margin: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 1rem;
    }

    .player {
        position: relative;
        display: flex;
        flex: 1;
    }

    .empty {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        height: 100%;
        outline: 1px dashed var(--color-outline);
        background: var(--color-bg-2);
        color: #666;
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
