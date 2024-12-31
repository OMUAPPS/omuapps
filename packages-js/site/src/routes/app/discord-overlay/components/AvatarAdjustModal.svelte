<script lang="ts">
    import { FileDrop, Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import { APP_ID } from '../app.js';
    import type { DiscordOverlayApp, Source } from '../discord-overlay-app.js';
    import { scaleFactor, selectedAvatar } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    const { config, voiceState, speakingState } = overlayApp;

    let lastMouse: {x: number, y: number} | null = null;
    let dragger: HTMLElement | null = null;
    
    function handleMouseMove(event: MouseEvent) {
        if (!lastMouse) return;
        if (!$selectedAvatar) return;
        const avatarConfig = $config.avatars[$selectedAvatar];
        if (!avatarConfig) return;
        const [x, y] = avatarConfig.offset;
        const dx = event.clientX - lastMouse.x;
        const dy = event.clientY - lastMouse.y;
        avatarConfig.offset = [x + dx / $scaleFactor, y + dy / $scaleFactor];
        lastMouse = {x: event.clientX, y: event.clientY};
    }

    function handleMouseDown(event: MouseEvent) {
        lastMouse = {x: event.clientX, y: event.clientY};
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseWheel(event: WheelEvent) {
        const avatarConfig = $selectedAvatar && $config.avatars[$selectedAvatar];
        if (!avatarConfig) return;
        const level = Math.log2(avatarConfig.scale);
        avatarConfig.scale = Math.pow(2, level - event.deltaY / 1000 * 0.5);
    }

    function handleMouseUp() {
        lastMouse = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        $config.avatars = {...$config.avatars};
    }

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    async function upload(file: File): Promise<Source> {
        const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()).then((buf) => {
            return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        });
        const avatarId = APP_ID.join('avatar', hash);
        overlayApp.omu.assets.upload(avatarId, new Uint8Array(await file.arrayBuffer()));
        return {
            type: 'asset',
            asset_id: avatarId.key(),
        };
    }

    async function getSourceUrl(source: Source): Promise<string> {
        const buffer = await overlayApp.getSource(source);
        return URL.createObjectURL(new Blob([buffer]));
    }

    $: avatarConfig = $selectedAvatar && $config.avatars[$selectedAvatar];
</script>

{#if $selectedAvatar && avatarConfig}
    {@const avatar = $selectedAvatar}
    <button
        bind:this={dragger}
        on:mousedown={handleMouseDown}
        on:wheel={handleMouseWheel}
        aria-label="Avatar Origin"
        class="origin"
    ></button>
    <div class="actions">
        <button on:click={() => {
            if (!$selectedAvatar) return;
            if (!avatarConfig) return;
            avatarConfig.offset = [0, 0];
            avatarConfig.scale = 1;
            if (avatarConfig.type === 'pngtuber') {
                avatarConfig.flipHorizontal = false;
                avatarConfig.flipVertical = false;
            }
            $config.avatars[$selectedAvatar] = avatarConfig;
        }} class="flip">
            もとに戻す
            <i class="ti ti-refresh"></i>
        </button>
        {#if avatarConfig.type === 'pngtuber'}
            <button on:click={() => {
                if (!$selectedAvatar) return;
                if (!avatarConfig) return;
                if (avatarConfig.type !== 'pngtuber') return;
                avatarConfig.flipHorizontal = !avatarConfig.flipHorizontal;
                avatarConfig.offset[0] = -avatarConfig.offset[0];
                $config.avatars[$selectedAvatar] = avatarConfig;
            }} class="flip">
                左右を反転
                <i class="ti ti-arrows-horizontal"></i>
            </button>
            <button on:click={() => {
                if (!$selectedAvatar) return;
                if (!avatarConfig) return;
                if (avatarConfig.type !== 'pngtuber') return;
                avatarConfig.flipVertical = !avatarConfig.flipVertical;
                avatarConfig.offset[1] = -avatarConfig.offset[1];
                $config.avatars[$selectedAvatar] = avatarConfig;
            }} class="flip">
                上下を反転
                <i class="ti ti-arrows-vertical"></i>
            </button>
            <small>
                左側を向くように調整してください
            </small>
        {/if}
        <button on:click={() => {
            $selectedAvatar = null;
        }} class="close">
            完了
            <i class="ti ti-check"></i>
        </button>
    </div>
    <button on:click={() => {
        $selectedAvatar = null;
    }} class="close">
        完了
        <i class="ti ti-check"></i>
    </button>
    <span class="message">
        <p>アバターを移動して上の枠に顔が合うように調整してください</p>
        <small>
            <p>マウスホイールで拡大縮小</p>
            <p>つかんで移動</p>
        </small>
    </span>
    {#if avatarConfig}
        <div class="png-settings">
            {#if avatarConfig.type === 'png'}
                {@const stateVoice = $config.user_id && $voiceState[$config.user_id]?.voice_state}
                {@const stateSpeaking = $config.user_id && $speakingState[$config.user_id]?.speaking}
                {@const stateType =
                    stateVoice && (stateVoice.self_deaf || stateVoice.deaf) ? 'deafened' :
                        stateVoice && (stateVoice.self_mute || stateVoice.mute) ? 'muted' :
                            stateSpeaking ? 'active' : null
                }
                <div class="sprite">
                    <div class="png-avatar">
                        {#await getSourceUrl(avatarConfig.base) then url}
                            <img src={url} alt="avatar" />
                        {/await}
                    </div>
                    <p class:active={!stateType}>基本</p>
                </div>
                <div class="sprite">
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        const newConfig = {
                            ...avatarConfig,
                            active: await upload(file),
                        };
                        newConfig.key = JSON.stringify({
                            base: newConfig.base,
                            active: newConfig.active,
                            deafened: newConfig.deafened,
                            muted: newConfig.muted,
                        });
                        $config.avatars[avatar] = newConfig;
                    }}>
                        <Tooltip>
                            喋っている時のアバターを設定
                        </Tooltip>
                        <div class="png-avatar">
                            {#if avatarConfig.active}
                                {#await getSourceUrl(avatarConfig.active) then url}
                                    <img src={url} alt="avatar" />
                                {/await}
                            {:else}
                                <p>未設定</p>
                            {/if}
                        </div>
                    </FileDrop>
                    <p class:active={stateType === 'active'}>喋っている時</p>
                </div>
                <div class="sprite">
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        const newConfig = {
                            ...avatarConfig,
                            muted: await upload(file),
                        };
                        newConfig.key = JSON.stringify({
                            base: newConfig.base,
                            active: newConfig.active,
                            deafened: newConfig.deafened,
                            muted: newConfig.muted,
                        });
                        $config.avatars[avatar] = newConfig;
                    }}>
                        <Tooltip>
                            喋れない時のアバターを設定
                        </Tooltip>
                        <div class="png-avatar">
                            {#if avatarConfig.muted}
                                {#await getSourceUrl(avatarConfig.muted) then url}
                                    <img src={url} alt="avatar" />
                                {/await}
                            {:else}
                                <p>未設定</p>
                            {/if}
                        </div>
                    </FileDrop>
                    <p class:active={stateType === 'muted'}>喋れない時</p>
                </div>
                <div class="sprite">
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        const newConfig = {
                            ...avatarConfig,
                            deafened: await upload(file),
                        };
                        newConfig.key = JSON.stringify({
                            base: newConfig.base,
                            active: newConfig.active,
                            deafened: newConfig.deafened,
                            muted: newConfig.muted,
                        });
                        $config.avatars[avatar] = newConfig;
                    }}>
                        <Tooltip>
                            聞こえない時のアバターを設定
                        </Tooltip>
                        <div class="png-avatar">
                            {#if avatarConfig.deafened}
                                {#await getSourceUrl(avatarConfig.deafened) then url}
                                    <img src={url} alt="avatar" />
                                {/await}
                            {:else}
                                <p>未設定</p>
                            {/if}
                        </div>
                    </FileDrop>
                    <p class:active={stateType === 'deafened'}>聞こえない時</p>
                </div>
            {/if}
        </div>
    {/if}
{/if}

<style lang="scss">

    .origin {
        position: absolute;
        inset: 0;
        cursor: grab;
        background: transparent;
        border: none;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: absolute;
        right: 5rem;
        bottom: 2rem;
        color: var(--color-1);

        > small {
            margin-bottom: 1rem;
        }
    }

    .close {
        background: var(--color-1);
        color: var(--color-bg-2);
        outline: 1px solid var(--color-bg-2);
        outline-offset: -1px;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 2px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
        }
    }

    .flip {
        background: var(--color-bg-2);
        color: var(--color-1);
        outline: 1px solid var(--color-bg-2);
        outline-offset: -1px;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 2px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
        }
    }

    .message {
        position: absolute;
        left: 50%;
        top: 4rem;
        transform: translate(-50%, 0);
        padding: 0.25rem 1rem;
        font-size: 1rem;
        font-weight: 600;
        white-space: nowrap;
        color: var(--color-1);
        pointer-events: none;
    }

    .png-settings {
        position: absolute;
        left: 0;
        bottom: 0;
        margin: 2rem;
        display: flex;
        width: max(20rem, 25%);
        gap: 2rem;
    }

    .sprite {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.5rem;
        color: var(--color-1);
        width: 8rem;

        > p {
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0.25rem 0rem;
            text-align: center;

            &.active {
                background: var(--color-1);
                color: var(--color-bg-2);
                padding: 0.25rem 0.5rem;
                text-align: center;
            }
        }
    }

    .png-avatar {
        height: 10rem;
        width: 5.5rem;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        > p {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--color-1);
            text-align: center;
            line-height: 10rem;
            background: var(--color-bg-1);
        }
    }
</style>
