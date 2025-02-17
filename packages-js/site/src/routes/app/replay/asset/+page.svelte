<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import Player from '../components/Player.svelte';
    import { ReplayApp } from '../replay-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const { replayData, config } = new ReplayApp(omu);
    setClient(omu);

    let player: YT.Player;

    function updateReplay() {
        console.log('updateReplay');
        if (!player) return;
        const data = $replayData;
        if (!data) return;
        const timeElapsed = (Date.now() - data.start) / 1000;
        const time = timeElapsed + data.offset;
        player.seekTo(time ?? 0, true);
        if (data.playing) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }

    function updateConfig() {
        if (!player) return;
        player.setPlaybackRate($config.playbackRate);
    }

    let shorts = false;

    async function onReady() {
        player.playVideo();
        player.mute();
        updateReplay();
        if (!$replayData) return;
        const { title } = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + $replayData.videoId)
            .then((res) => res.json())
            .catch(() => {throw new Error('Failed to fetch video data')});
        shorts = title.includes('#shorts');
    }

    let ended = false;

    function onStateChange(event: YT.OnStateChangeEvent) {
        ended = event.target.getPlayerState() === YT.PlayerState.ENDED;
    }

    replayData.subscribe(() => {
        updateReplay();
        console.log('replayData', $replayData);
    });
    config.subscribe(() => updateConfig());

    if (BROWSER) {
        omu.start();
    }
</script>

<svelte:head>
    <script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

<AssetPage>
    <main>
        <Player
            videoId={$replayData?.videoId}
            bind:player
            options={{
                events: {
                    onReady,
                    onStateChange,
                },
            }}
            hide
            heightToWidthRatio={shorts ? 9 / 16 : 16 / 9}
        />
        <div class="thumbnail-overlay" class:show={ended}>
            <img src="https://i.ytimg.com/vi/{$replayData?.videoId}/maxresdefault.jpg" alt="" />
        </div>
    </main>
</AssetPage>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    :global(body) {
        background: transparent !important;
    }

    .thumbnail-overlay {
        position: absolute;
        inset: 0;
        display: none;
        background: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .thumbnail-overlay.show {
        display: flex;
    }
</style>
