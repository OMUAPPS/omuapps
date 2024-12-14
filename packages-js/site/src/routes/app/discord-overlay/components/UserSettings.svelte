<script lang="ts">
    import { FileDrop, Tooltip } from '@omujs/ui';
    import { APP_ID } from '../app.js';
    import type { DiscordOverlayApp, VoiceStateItem } from '../discord-overlay-app.js';
    import { heldAvatar, heldUser } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    export let state: VoiceStateItem;
    export let id: string;
    const { config } = overlayApp;

    function isJsonString(str: string) {
        try {
            JSON.parse(str);
        } catch {
            return false;
        }
        return true;
    }

    async function setAvatar(file: File) {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const decoder = new TextDecoder();
        const isPngtuber = file.name.endsWith('.save');
        if (isPngtuber) {
            if (!isJsonString(decoder.decode(uint8Array))) {
                throw new Error(`Invalid save file: ${file.name} is not a valid JSON file`);
            }
            const hash = await crypto.subtle.digest('SHA-256', buffer).then((buf) => {
                return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
            });
            const avatarId = APP_ID.join('avatar', hash);
            overlayApp.omu.assets.upload(avatarId, new Uint8Array(buffer));
            const existAvatarConfig = $config.avatars[avatarId.key()];
            $config.users[id] = {
                ...$config.users[id],
                avatar: avatarId.key(),
            };
            if (!existAvatarConfig) {
                $config.avatars[avatarId.key()] = {
                    type: 'pngtuber',
                    offset: [0, 0],
                    scale: 1,
                    flipHorizontal: false,
                    flipVertical: false,
                    source: {
                        type: 'asset',
                        asset_id: avatarId.key(),
                    }
                };
                $heldAvatar = avatarId.key();
            }
        } else {
            const hash = await crypto.subtle.digest('SHA-256', buffer).then((buf) => {
                return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
            });
            const avatarId = APP_ID.join('avatar', hash);
            overlayApp.omu.assets.upload(avatarId, new Uint8Array(buffer));
            const existAvatarConfig = $config.avatars[avatarId.key()];
            $config.users[id] = {
                ...$config.users[id],
                avatar: avatarId.key(),
            };
            if (!existAvatarConfig) {
                $config.avatars[avatarId.key()] = {
                    type: 'png',
                    base: {
                        type: 'asset',
                        asset_id: avatarId.key(),
                    }
                };
                $heldAvatar = avatarId.key();
            }
        }
    }

    async function handleReplace(files: FileList) {
        const file = files[0];
        await setAvatar(file);
    }

    const avatarUrl = state.user.avatar && `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png`;

    let settingElement: HTMLElement;

    function handleWindowClick(event: MouseEvent) {
        if (!$heldUser) return;
        if (!(event.target instanceof HTMLElement)) return;
        let target: HTMLElement | null = event.target;
        while (target) {
            if (target === settingElement) {
                return;
            }
            target = target.parentElement;
        }
        $heldUser = null;
    }

    $: avatar = $config.users[id].avatar;
</script>

<svelte:window on:mousedown={handleWindowClick} />

<div class="settings" bind:this={settingElement}>
    <div class="states">
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
            {#if $config.users[id].show}
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
    </div>
    <div class="actions">
        <FileDrop handle={handleReplace} accept=".save,image/*,.apng,.gif,.webp">
            <Tooltip>
                pngもしくはPNGTuber+のアバターが使えます
            </Tooltip>
            アバターを変更
            <i class="ti ti-upload"></i>
        </FileDrop>
        {#if avatar}
            <button type="button" on:click={()=>{
                $heldAvatar = avatar;
                $heldUser = null;
            }}>
                アバターを調整
                <i class="ti ti-settings"></i>
            </button>
        {/if}
    </div>
</div>


<style lang="scss">
    .settings {
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem 4rem;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border: none;
            background: var(--color-1);
            color: var(--color-bg-1);
            padding: 0.5rem 1rem;
            border-radius: 2px;
            font-weight: 600;
            font-size: 0.8rem;
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
            }
        }
    }

    .states {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-text);

        .avatar {
            width: 2rem;
            height: 2rem;
            border-radius: 100%;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        span {
            font-size: 0.9rem;
            font-weight: 600;
        }

        .visibility {
            margin-left: auto;
            background: transparent;
            border: none;
            color: var(--color-1);
            font-size: 1.25rem;
            cursor: pointer;
        }
    }
</style>
