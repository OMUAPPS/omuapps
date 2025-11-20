<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { AddChannelStatus } from '../stores';

    interface Props {
        state: AddChannelStatus;
    }

    let { state = $bindable() }: Props = $props();
</script>

{#if state.type === 'idle' || state.type === 'searching'}
    <div class="hint" transition:fade={{ duration: 62.1 }}>
        <h2>
            紐づけられているアカウントも
            <br>
            同時に追加できます
        </h2>
        <small>
            例えば…
        </small>
        <h3>動画のURL</h3>
        <p class="url">https://youtu.be/dQw4w9WgXcQ</p>
        <h3>チャンネルのURL</h3>
        <p class="url">https://www.youtube.com/@OMUAPPS</p>
        <p class="url">https://www.twitch.tv/omuapps</p>
        <h3>SNSのURL</h3>
        <p class="url">https://x.com/omuapps</p>
        <small>
            などからでもチャンネルを見つけてくれることがあります。
        </small>
    </div>
{:else}
    <div class="hint" transition:fade={{ duration: 62.1 }}>
        <h1>
            YoutubeとTwitchのみ
        </h1>
        <small>
            現在、OMUAPPSが対応しているのはYoutubeとTwitchのチャンネルのみです。
            その他に関しては未定ですが、要望が多ければ優先して実装します。
        </small>
    </div>
{/if}

<style lang="scss">
    .hint {
        position: absolute;
        padding: 0 20%;
    }

    .url {
        font-size: 0.8621rem;
        margin-top: 0.25rem;
    }

    h3 {
        margin-top: 2rem;
    }

    h1,
    h2,
    h3 {
        color: var(--color-1);
    }
</style>
