<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat } from '@omujs/chat';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AppHeader, TableList, Textbox, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import Player from './components/Player.svelte';
    import RoomEntry from './components/RoomEntry.svelte';
    import { ReplayApp } from './replay-app.js';
    import { playVideo } from './stores.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const { replayData, config } = new ReplayApp(omu);
    setClient(omu);

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

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

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
</script>

<svelte:head>
    <script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <div class="container">
            <div class="menu">
                <div class="streams">
                    <h3>
                        最近の配信から
                        <i class="ti ti-video"></i>
                        <div class="search">
                            <input type="search" bind:value={search} placeholder="検索" />
                            {#if !search}
                                <i class="ti ti-search"></i>
                            {/if}
                        </div>
                    </h3>
                    <div class="table">
                        <TableList
                            table={chat.rooms}
                            component={RoomEntry}
                            filter={(_, room) =>
                                !!(
                                    room.metadata?.url &&
                                    (!search ||
                                        room.metadata.title
                                            ?.toLowerCase()
                                            .includes(search.toLowerCase()))
                                )}
                        >
                            <p slot="empty" class="no-streams">
                                配信が追加されるとここに表示されます
                            </p>
                        </TableList>
                    </div>
                </div>
                <section>
                    <h3>
                        配信ソフトに追加する
                        <i class="ti ti-arrow-bar-to-down"></i>
                    </h3>
                    <AssetButton {omu} {obs} dimensions={{width: '50:%', height: '50:%'}} />
                </section>
            </div>
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
                <section class="url">
                    <p>
                        URLから
                        <i class="ti ti-link"></i>
                    </p>
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
                </section>
            </div>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        padding: 2rem;
        color: var(--color-1);
        container-type: inline-size;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
    }

    .container {
        display: flex;
        gap: 2rem;
        flex: 1;
    }

    h3 {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
        font-size: 1rem;
    }

    .menu {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 0 0 22rem;
        gap: 1rem;

        > .streams {
            flex: 1;
            display: flex;
            flex-direction: column;

            > h3 {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                white-space: nowrap;

                > .search {
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
            }

            > .table {
                flex: 1;
                overflow: auto;
                overflow-x: hidden;
                border-bottom: 1px solid var(--color-outline);
                margin-bottom: 0.25rem;
                padding-bottom: 1rem;
            }
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

    .url {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
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
