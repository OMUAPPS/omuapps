<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat } from '@omujs/chat';
    import { Omu } from '@omujs/omu';
    import { AppHeader, FlexRowWrapper, TableList, Textbox, Toggle, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import Player from './components/Player.svelte';
    import RoomEntry from './components/RoomEntry.svelte';
    import { ReplayApp } from './replay-app.js';
    import { playVideo } from './stores.js';
    const omu = new Omu(APP);
    const chat = new Chat(omu);
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
        event.target.playVideo();
        event.target.mute();
        if (!$replayData) return;
    }

    function onPlaybackRateChange(event: YT.OnPlaybackRateChangeEvent) {
        $config.playbackRate = event.data;
    }

    function onStateChange(event: YT.OnStateChangeEvent) {
        console.log('onStateChange', event.data);
        if (!$replayData) return;
        $replayData = {
            videoId: $replayData.videoId,
            offset: event.target.getCurrentTime(),
            start: Date.now(),
            playing: event.data === YT.PlayerState.PLAYING,
        };
        console.log($replayData);
    }

    if (BROWSER) {
        omu.start();
    }

    const promise = new Promise<void>((resolve) => omu.onReady(resolve));
</script>

<svelte:head>
    <script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

<AppPage>
    <header slot="header">
        {#await promise}
            <AppHeader app={omu.app} />
        {:then}
            <AppHeader app={omu.app}>
                <FlexRowWrapper alignItems="center" gap>
                    <small>表示</small>
                    <Toggle bind:value={$config.active} />
                </FlexRowWrapper>
            </AppHeader>
            <slot />
        {/await}
    </header>
    <main>
        <div class="menu">
            <section>
                <h3>
                    配信ソフトに追加する
                    <i class="ti ti-arrow-bar-to-down" />
                </h3>
                <AssetButton />
            </section>
            <div class="streams">
                <h3>
                    最近の配信から
                    <i class="ti ti-video" />
                </h3>
                <div class="table">
                    <TableList
                        table={chat.rooms}
                        component={RoomEntry}
                        filter={(_, room) => !!room.metadata?.url}
                    />
                </div>
            </div>
        </div>
        <div class="player">
            <Player
                videoId={$replayData?.videoId}
                options={{
                    events: {
                        onReady,
                        onPlaybackRateChange,
                        onStateChange,
                    },
                }}
            />
            <section>
                <p>
                    URLから
                    <i class="ti ti-link" />
                </p>
                <Textbox
                    placeholder="URLを入力"
                    on:input={(event) => {
                        const url = new URL(event.detail);
                        if (url.hostname === 'youtu.be') {
                            const videoId = url.pathname.slice(1);
                            $playVideo(videoId);
                        } else if (url.hostname.endsWith('youtube.com')) {
                            const videoId = url.searchParams.get('v');
                            if (!videoId) return;
                            $playVideo(videoId);
                        } else {
                            console.log('unsupported url', url);
                        }
                    }}
                    lazy
                />
            </section>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 2rem;
        padding: 2rem;
        color: var(--color-1);
    }

    h3 {
        margin-bottom: 0.5rem;
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

            > .table {
                flex: 1;
                overflow: auto;
            }
        }
    }

    .player {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 1rem;
    }
</style>
