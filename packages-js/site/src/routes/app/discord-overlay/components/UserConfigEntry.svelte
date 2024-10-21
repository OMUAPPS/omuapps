<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { APP_ID } from '../app.js';
    import type { DiscordOverlayApp, VoiceStateItem } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    export let id: string;
    export let state: VoiceStateItem;
    const { config, speakingState } = overlayApp;

    const avatarUrl = state.user.avatar && `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png`;


    async function setAvatar(userId: string, avatar: string | null) {
        const encoded = new TextEncoder().encode(avatar || '');
        const hash = await crypto.subtle.digest('SHA-256', encoded).then((buf) => {
            return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        });
        const avatarId = APP_ID.join('avatar', hash);
        overlayApp.omu.assets.upload(avatarId, encoded);
        $config.users[userId] = {
            ...$config.users[userId],
            avatar: avatarId.key(),
        };
    }

    function handleReplace() {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const decoded = atob(base64.split(',')[1]);
            setAvatar(id, decoded);
        };
        reader.readAsDataURL(file);
    }

    let fileDrop: HTMLInputElement;
    let files: FileList;
</script>

<button
    class="entry"
    class:speaking={$speakingState[id]?.speaking}
    on:mouseover={() => ($config.selected_user_id = id)}
    on:mouseleave={() => ($config.selected_user_id = null)}
    on:focus={() => ($config.selected_user_id = id)}
    on:blur={() => ($config.selected_user_id = null)}
>
    <div class="avatar">
        {#if avatarUrl}
            <img src={avatarUrl} alt={state.nick} />
        {:else}
            <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt={state.nick} />
        {/if}
    </div>
    <p>{state.nick}</p>
    <div class="states">
        {#if state.voice_state.self_mute || state.voice_state.mute}
            🔇
        {/if}
        {#if state.voice_state.self_deaf || state.voice_state.deaf}
            🔊
        {/if}
    </div>
    <div class="actions">
        <button type="button" on:click={() => fileDrop.click()}>
            <Tooltip>
                アバターを変更
            </Tooltip>
            <i class="ti ti-upload" />
        </button>
        <button on:click={() => $config.users[id].show = !$config.users[id].show}>
            {#if $config.users[id].show}
                <Tooltip>
                    クリックで非表示
                </Tooltip>
                <i class="ti ti-eye-filled" />
            {:else}
                <Tooltip>
                    クリックで表示
                </Tooltip>
                <i class="ti ti-eye-off" />
            {/if}
        </button>
    </div>
</button>
<input type="file" bind:this={fileDrop} bind:files on:change={handleReplace} hidden/>

<style lang="scss">
    .entry {
        border: none;
        background: var(--color-bg-2);
        color: var(--color-text);
        font-weight: 600;
        font-size: 0.9rem;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 3rem;
        padding: 0 0.75rem;
        margin-bottom: 2px;

        &:hover {
            background: var(--color-bg-1);
        }

        &.speaking {
            > p {
                color: var(--color-1);
            }

            > .avatar {
                outline: 2px solid var(--color-1);
                outline-offset: -1px;

                > img {
                    outline: 2px solid var(--color-bg-1);
                    outline-offset: -2px;
                }
            }
        }
    }

    p {
        font-size: 0.8rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .actions {
        display: flex;
        margin-left: auto;
        gap: 0.25rem;
    }

    .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
    }

    button {
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: 600;
        gap: 0.5rem;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;

        &:focus-visible,
        &:hover {
            outline: 1px solid var(--color-1);
            background: var(--color-bg-2);
        }

        &:active {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }
</style>
