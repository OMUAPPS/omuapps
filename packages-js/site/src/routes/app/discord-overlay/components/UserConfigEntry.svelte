<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { Writable } from 'svelte/store';
    import type { Config, VoiceStateItem } from '../discord-overlay-app.js';

    export let config: Writable<Config>;
    export let id: string;
    export let state: VoiceStateItem;

    const avatarUrl = `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png`;

    function handleReplace() {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            console.log(base64);
        };
        reader.readAsDataURL(file);
    }

    let fileDrop: HTMLInputElement;
    let files: FileList;
</script>

<button>
    <img class="avatar" src={avatarUrl} alt={state.nick} />
    <div>{state.nick}</div>
    <div class="states">
        {#if state.voice_state.self_mute || state.voice_state.mute}
            🔇
        {/if}
        {#if state.voice_state.self_deaf || state.voice_state.deaf}
            🔊
        {/if}
    </div>
    <div class="actions">
        <button type="button" on:click={() => fileDrop.click()} class="show">
            <Tooltip>
                アバターを変更
            </Tooltip>
            <i class="ti ti-upload" />
        </button>
        <button class="show" on:click={() => $config.users[id].show = !$config.users[id].show}>
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
    button {
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: 600;
        font-size: 0.9rem;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        height: 3rem;
        padding: 0 1rem;

        &:hover {
            background: var(--color-bg-1);
        }
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
    }

    .show {
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;

        &:hover {
            outline: 1px solid var(--color-1);
            background: var(--color-bg-2);
        }
    }
</style>
