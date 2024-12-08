<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { APP_ID } from '../app.js';
    import type { DiscordOverlayApp, VoiceStateItem } from '../discord-overlay-app.js';
    import { heldUser } from '../states.js';

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
    tabindex="0"
    on:click={() => $heldUser = id}
>
    <div class="avatar">
        {#if avatarUrl}
            <img src={avatarUrl} alt={state.nick} />
        {:else}
            <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt={state.nick} />
        {/if}
    </div>
    <span>{state.nick}</span>
    {#if state.voice_state.self_mute || state.voice_state.mute}
        🔇
    {/if}
    {#if state.voice_state.self_deaf || state.voice_state.deaf}
        🔊
    {/if}
    <button class="visibility" on:click={() => $config.users[id].show = !$config.users[id].show}>
        {#if $config.users[id]?.show}
            <Tooltip>
                非表示にする
            </Tooltip>
            <i class="ti ti-eye-filled"></i>
        {:else}
            <Tooltip>
                表示する
            </Tooltip>
            <i class="ti ti-eye-off"></i>
        {/if}
    </button>
</button>
<input type="file" bind:this={fileDrop} bind:files on:change={handleReplace} hidden/>

<style lang="scss">
    .entry {
        position: relative;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-text);
        font-weight: 600;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        padding-right: 0.5rem;
        width: 100%;

        &.speaking {
            > span {
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

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -3px;
        }
    }

    .visibility {
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
        margin-left: auto;
        margin-right: 0.25rem;
        border-radius: 2px;

        &:focus-visible,
        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        &:active {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }

    span {
        font-size: 0.8rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .avatar {
        min-width: 2rem;
        width: 2rem;
        min-height: 2rem;
        height: 2rem;
        border-radius: 50%;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
    }
</style>
