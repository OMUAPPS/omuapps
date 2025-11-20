<script lang="ts">
    import { onMount } from 'svelte';
    import type { Playback, Video } from '../../replay-app';

    interface Props {
        video: Extract<Video, { type: 'twitch' }>;
        playback: Playback;
    }

    let { video, playback = $bindable() }: Props = $props();

    onMount(() => {
        const options = {
            width: '100%',
            height: '100%',
            channel: video.channel,
            // video: '<video ID>',
            // collection: '<collection ID>',
            parent: [location.hostname],
            autoplay: false,
        };
        const player = new Twitch.Player('TwitchPlayer', options);
        player.addEventListener(Twitch.Player.READY, function () {
        });
        player.addEventListener(Twitch.Player.PLAY, function () {
            playback = {
                start: Date.now(),
                offset: player.getCurrentTime(),
                playing: true,
            };
        });
        player.addEventListener(Twitch.Player.PAUSE, function () {
            playback = {
                start: Date.now(),
                offset: player.getCurrentTime(),
                playing: false,
            };
        });
    });
</script>

<div id="TwitchPlayer"></div>

<style lang="scss">
    #TwitchPlayer {
        position: absolute;
        inset: 0;
    }
</style>
