<script lang="ts">
    import { Button, FileDrop, Tooltip } from '@omujs/ui';
    import { APP_ID } from '../app.js';
    import { DEFAULT_USER_CONFIG, type DiscordOverlayApp, type PngAvatarConfig, type VoiceStateItem } from '../discord-overlay-app.js';
    import { heldUser, selectedAvatar } from '../states.js';

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
                ...DEFAULT_USER_CONFIG,
                ...$config.users[id],
                avatar: avatarId.key(),
            };
            if (!existAvatarConfig) {
                $config.avatars[avatarId.key()] = {
                    type: 'pngtuber',
                    key: '',
                    offset: [0, 0],
                    scale: 1,
                    flipHorizontal: false,
                    flipVertical: false,
                    source: {
                        type: 'asset',
                        asset_id: avatarId.key(),
                    }
                };
                $selectedAvatar = avatarId.key();
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
                const newConfig: PngAvatarConfig = {
                    type: 'png',
                    key: '',
                    offset: [0, 0],
                    scale: 1,
                    base: {
                        type: 'asset',
                        asset_id: avatarId.key(),
                    }
                };
                newConfig.key = JSON.stringify({
                    base: newConfig.base,
                    active: newConfig.active,
                    deafened: newConfig.deafened,
                    muted: newConfig.muted,
                })
                $config.avatars[avatarId.key()] = newConfig;
                $selectedAvatar = avatarId.key();
            }
        }
    }

    async function handleReplace(files: FileList) {
        const file = files[0];
        await setAvatar(file);
    }

    const avatarUrl = state.user.avatar && `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png`;

    let settingElement: HTMLElement;
    let configOpen = false;

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
    </div>
    <div class="actions">
        <span style="display: flex; gap: 0.5rem;">
            <FileDrop primary handle={handleReplace} accept=".save,image/*,.apng,.gif,.webp">
                <Tooltip>
                    画像もしくはPNGTuber+のアバターが使えます
                </Tooltip>
                アバターを変更
                <i class="ti ti-upload"></i>
            </FileDrop>
            {#if avatar}
                <Button onclick={()=>{
                    $config.users[id].avatar = '';
                }}>
                    <Tooltip>
                        アバターを削除
                    </Tooltip>
                    <i class="ti ti-trash"></i>
                </Button>
            {/if}
        </span>
        {#if avatar}
            <Button onclick={() => {
                $selectedAvatar = avatar;
                $heldUser = null;
            }}>
                アバターを調整
                <i class="ti ti-settings"></i>
            </Button>
        {/if}
    </div>
    {#if avatar && $config.avatars[avatar]?.type === 'pngtuber'}
        <button on:click={()=>{configOpen = !configOpen;}} class="config-toggle">
            <Tooltip>
                レイヤーを変更
            </Tooltip>
            PNGTuber+
            {#if configOpen}
                <i class="ti ti-chevron-up"></i>
            {:else}
                <i class="ti ti-chevron-down"></i>
            {/if}
        </button>
        {#if configOpen}
            <div class="pngtuber-config">
                {#each Array.from({ length: 10 }) as _, i (i)}
                    <button
                        on:click={()=>{
                            $config.users[id].config.pngtuber.layer = i;
                        }}
                        class="layer"
                        class:active={$config.users[id].config.pngtuber.layer === i}>
                        {i}
                    </button>
                {/each}
            </div>
        {/if}
    {/if}
</div>


<style lang="scss">
    .settings {
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 0.25rem;
    }

    .states {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: var(--color-text);
        margin-bottom: 1rem;

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
    }

    .config-toggle {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        text-align: start;
        width: 100%;
        background: transparent;
        color: var(--color-1);
        border: none;
        border-bottom: 1px solid var(--color-1);
        padding: 0.5rem 2px;
        border-radius: 2px;
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
    }

    .pngtuber-config {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.25rem;
        justify-content: start;
        width: 100%;
        margin-bottom: 0.5rem;

        .layer {
            background: var(--color-bg-1);
            border: none;
            color: var(--color-text);
            width: 100%;
            height: 2.5rem;
            border-radius: 2px;
            font-weight: 600;
            font-size: 0.8rem;
            outline-offset: -1px;
            cursor: pointer;

            &.active {
                background: var(--color-1);
                color: var(--color-bg-1);
            }

            &:hover {
                outline: 1px solid var(--color-1);
            }
        }
    }
</style>
