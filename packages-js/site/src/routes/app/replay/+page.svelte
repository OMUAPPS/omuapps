<script lang="ts">
    import { Omu } from '@omujs/omu';
    import {
        AppHeader,
        DragLink,
        FlexRowWrapper,
        TableList,
        Textbox,
        Toggle,
        setClient,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { APP } from './app.js';
    import { ReplayApp } from './replay-app.js';
    import Player from './components/Player.svelte';
    import { Chat } from '@omujs/chat';
    import RoomEntry from './components/RoomEntry.svelte';
    import { playVideo } from './stores.js';
    import { page } from '$app/stores';
    import AppPage from '$lib/components/AppPage.svelte';
    const omu = new Omu(APP);
    const chat = new Chat(omu);
    const { replayData, config } = new ReplayApp(omu);
    setClient(omu);

    let player: YT.Player | undefined;

    $playVideo = (videoId: string) => {
        $replayData = {
            videoId,
            offset: 0,
            start: Date.now(),
            playing: true,
        };
    };

    function onReady(event: YT.PlayerEvent) {
        player = event.target;
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

    function createAssetUrl() {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset`;
        url.searchParams.set('assetId', Date.now().toString());
        return url;
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
        <div class="rooms">
            <h3>URLから</h3>
            <Textbox
                placeholder="URLを入力"
                on:input={(event) => {
                    const url = new URL(event.detail.value);
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
            <h3>最近の配信から</h3>
            <div class="table">
                <TableList
                    table={chat.rooms}
                    component={RoomEntry}
                    filter={(_, room) => !!room.metadata?.url}
                />
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

            <h3>アセット</h3>
            <DragLink href={createAssetUrl}>
                <h3 slot="preview" class="drag-preview">
                    これをOBSにドロップ
                    <i class="ti ti-upload" />
                </h3>
                <div class="drag">
                    <i class="ti ti-drag-drop" />
                    ここをOBSにドラッグ&ドロップ
                </div>
            </DragLink>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        height: calc(100vh - 5rem);
        gap: 2rem;
        padding: 2rem;
        padding-top: 1rem;
        margin-bottom: 2rem;
        color: var(--color-1);
    }

    h3 {
        margin-top: 1rem;
    }

    .rooms {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 0 0 20rem;

        > .table {
            height: calc(100% - 10rem);
            flex: 1;
        }
    }

    .player {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .drag-preview {
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        margin-top: 1rem;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        padding: 10px;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &:hover {
            margin-left: 4px;
            outline: 2px solid var(--color-1);
            box-shadow: -4px 4px 0 2px var(--color-2);
            transition: 0.0621s;
        }
    }
</style>
