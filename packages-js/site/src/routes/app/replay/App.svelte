<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import type { Chat } from '@omujs/chat';
    import { OBSPlugin } from '@omujs/obs';
    import { Button, TableList, Textbox, Tooltip } from '@omujs/ui';
    import Config from './components/Config.svelte';
    import Menu from './components/Menu.svelte';
    import MenuSection from './components/MenuSection.svelte';
    import Player from './components/Player.svelte';
    import RoomEntry from './components/RoomEntry.svelte';
    import { ReplayApp } from './replay-app.js';
    import { playVideo } from './stores.js';

    export let obs: OBSPlugin;
    export let chat: Chat;

    const { replayData, config, omu } = ReplayApp.getInstance();

    $playVideo = (videoId: string) => {
        $replayData = {
            videoId,
            offset: 0,
            start: Date.now(),
            playing: true,
        };
    };

    function onReady(event: YT.PlayerEvent) {
        const player = event.target;
        player.playVideo();
        player.mute();
    }

    function onPlaybackRateChange(event: YT.OnPlaybackRateChangeEvent) {
        $config.playbackRate = event.data;
    }

    function onStateChange(event: YT.OnStateChangeEvent) {
        if (!$replayData) return;
        $replayData = {
            videoId: $replayData.videoId,
            offset: event.target.getCurrentTime(),
            start: Date.now(),
            playing: event.data === YT.PlayerState.PLAYING,
        };
    }

    let search: string = '';

    function matchVideoID(url: URL): string | undefined {
        if (url.hostname === 'youtu.be') {
            return url.pathname.slice(1);
        } else if (url.hostname.endsWith('youtube.com')) {
            const path = url.pathname.split('/');
            switch (path[1]) {
                case 'watch':
                    return url.searchParams.get('v') || undefined;
                case 'embed':
                case 'shorts':
                case 'live':
                    return path[2] || undefined;
                default:
                    return undefined;
            }
        }
    }

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
                    if (
                        room.providerId.key() !==
                        'com.omuapps:chatprovider/youtube'
                    ) return false;
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
                {omu}
                {obs}
                dimensions={{ width: '50:%', height: '50:%' }}
            />
        </MenuSection>
    </Menu>
    <div class="player">
        {#if $replayData}
            <Player
                videoId={$replayData.videoId}
                options={{
                    events: {
                        onReady,
                        onPlaybackRateChange,
                        onStateChange,
                    },
                }}
            />
        {:else}
            <div class="empty">
                動画を選択するとここに表示されます
                <i class="ti ti-video"></i>
            </div>
        {/if}
        <MenuSection name="URLから" icon="ti-link">
            <Textbox
                placeholder="https://youtu.be/..."
                on:input={(event) => {
                    const url = new URL(event.detail);
                    const videoId = matchVideoID(url);
                    if (!videoId) return;
                    $playVideo(videoId);
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

    .player {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 1rem;
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
