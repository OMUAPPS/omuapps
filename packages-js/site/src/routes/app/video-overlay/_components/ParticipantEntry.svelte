<script lang="ts">
    import type { User } from '../../discord-overlay/discord/type';
    import type { SocketParticipant } from '../rtc/connection';
    import { bindMediaStream } from '../rtc/video';

    interface Props {
        user: User;
        socket?: SocketParticipant;
    }

    let { user, socket }: Props = $props();
</script>

<div class="participant">
    {#if socket?.stream}
        {#if socket.stream.type === 'playing'}
            {#key socket.stream}
                <video playsinline autoplay muted use:bindMediaStream={socket.stream.media}></video>
                <button onclick={socket.stream.close}>閉じる</button>
            {/key}
        {:else}
            <img src={socket.stream.info.thumbnail} alt="Thumbnail" />
            <button onclick={socket.stream.request} class="watch">
                見る
                <i class="ti ti-player-play"></i>
            </button>
        {/if}
    {:else}
        <div class="avatar" class:offline={!socket}>
            {#if user.avatar}
                <img src="https://cdn.discordapp.com/avatars/{user.id}/{user.avatar}.png" alt="" class="avatar" />
            {:else}
                <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" class="avatar" />
            {/if}
        </div>
    {/if}
    {#if !socket}
        <div class="overlay">
            <p>
                接続されていません<i class="ti ti-wifi-off"></i>
            </p>
        </div>
    {/if}
    <p class="name">{user.global_name}</p>
</div>

<style>
    .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 8rem;
        height: 8rem;

        &.offline {
            opacity: 0.2;
        }

        > img {
            width: 4rem;
            height: 4rem;
            border-radius: 100rem;
        }
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--color-text);
    }

    .watch {
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        border: none;
        background: color-mix(in srgb, var(--color-bg-2) 60%, transparent 0%);
        color: var(--color-1);
        padding: 1rem 2rem;
        border-radius: 3px;
        cursor: pointer;
    }

    .participant {
        position: relative;
        background: var(--color-bg-2);
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;

        > video, img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        > .name {
            position: absolute;
            left: 1rem;
            bottom: 0.75rem;
            border-bottom: 1px solid var(--color-1);
            color: var(--color-1);
            padding: 0.25rem 0;
        }
    }

</style>
