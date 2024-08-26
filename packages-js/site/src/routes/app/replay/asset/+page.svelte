<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { IDENTIFIER } from '../app.js';
    import Player from '../components/Player.svelte';
    import { ReplayApp } from '../replay-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(IDENTIFIER.join('asset', id), {
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

    function onReady(event: YT.PlayerEvent) {
        event.target.playVideo();
        event.target.mute();
        updateReplay();
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
        {#if $config.active}
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
            />
            <div class="thumbnail-overlay" class:show={ended}>
                <img src="https://i.ytimg.com/vi/{$replayData?.videoId}/maxresdefault.jpg" />
            </div>
        {/if}
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
