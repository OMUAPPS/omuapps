<script lang="ts">
    import { FileDrop, Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import { APP_ID } from '../app.js';
    import type { DiscordOverlayApp, Source } from '../discord-overlay-app.js';
    import { heldAvatar } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    const { config } = overlayApp;

    let lastMouse: {x: number, y: number} | null = null;
    let dragger: HTMLElement | null = null;
    
    function handleMouseMove(event: MouseEvent) {
        if (!lastMouse) return;
        if (!$heldAvatar) return;
        const avatarConfig = $config.avatars[$heldAvatar];
        if (avatarConfig && avatarConfig.type === 'pngtuber') {
            const [x, y] = avatarConfig.offset;
            const dx = event.clientX - lastMouse.x;
            const dy = event.clientY - lastMouse.y;
            avatarConfig.offset = [x + dx, y + dy];
            lastMouse = {x: event.clientX, y: event.clientY};
        }
    }

    function handleMouseDown(event: MouseEvent) {
        lastMouse = {x: event.clientX, y: event.clientY};
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseWheel(event: WheelEvent) {
        const avatarConfig = $heldAvatar && $config.avatars[$heldAvatar];
        if (avatarConfig && avatarConfig.type === 'pngtuber') {
            avatarConfig.scale -= event.deltaY / 1000 * 0.5;
        }
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
</script>

<button
    bind:this={dragger}
    on:mousedown={handleMouseDown}
    on:wheel={handleMouseWheel}
    aria-label="Avatar Origin"
    class="origin"
></button>
<div class="actions">
    {#if $heldAvatar && $config.avatars[$heldAvatar].type === 'pngtuber'}
        <button on:click={() => {
            if (!$heldAvatar) return;
            const avatarConfig = $config.avatars[$heldAvatar];
            if (avatarConfig.type !== 'pngtuber') return;
            avatarConfig.flipHorizontal = !avatarConfig.flipHorizontal;
            avatarConfig.offset[0] = -avatarConfig.offset[0];
            $config.avatars[$heldAvatar] = avatarConfig;
        }} class="flip">
            左右を反転
            <i class="ti ti-arrows-horizontal"></i>
        </button>
        <small>
            左側を向くように調整してください
        </small>
    {/if}
    {#if $heldAvatar && $config.avatars[$heldAvatar]}
        {@const avatarConfig = $config.avatars[$heldAvatar]}
        {@const avatar = $heldAvatar}
        <div class="png-settings">
            {#if avatarConfig.type === 'png'}
                {#await getSourceUrl(avatarConfig.base) then url}
                    <img src={url} alt="avatar" class="png-avatar" />
                {/await}
                <div class="sprite">
                    {#if avatarConfig.active}
                        {#await getSourceUrl(avatarConfig.active) then url}
                            <img src={url} alt="avatar" class="png-avatar" />
                        {/await}
                    {:else}
                        未設定
                        <i class="ti ti-upload"></i>
                    {/if}
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        $config.avatars[avatar] = {
                            ...avatarConfig,
                            active: await upload(file),
                        };
                    }}>
                        <Tooltip>
                            アクティブ時のアバターを設定
                        </Tooltip>
                    </FileDrop>
                </div>
                <div class="sprite">
                    {#if avatarConfig.deafened}
                        {#await getSourceUrl(avatarConfig.deafened) then url}
                            <img src={url} alt="avatar" class="png-avatar" />
                        {/await}
                    {:else}
                        未設定
                        <i class="ti ti-upload"></i>
                    {/if}
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        $config.avatars[avatar] = {
                            ...avatarConfig,
                            deafened: await upload(file),
                        };
                    }}>
                        <Tooltip>
                            アクティブ時のアバターを設定
                        </Tooltip>
                    </FileDrop>
                </div>
                <div class="sprite">
                    {#if avatarConfig.muted}
                        {#await getSourceUrl(avatarConfig.muted) then url}
                            <img src={url} alt="avatar" class="png-avatar" />
                        {/await}
                    {:else}
                        未設定
                        <i class="ti ti-upload"></i>
                    {/if}
                    <FileDrop handle={async (files) => {
                        if (files.length !== 1) return;
                        const file = files[0];
                        if (avatarConfig.type !== 'png') return;
                        $config.avatars[avatar] = {
                            ...avatarConfig,
                            muted: await upload(file),
                        };
                    }}>
                        <Tooltip>
                            アクティブ時のアバターを設定
                        </Tooltip>
                    </FileDrop>
                </div>
            {/if}
        </div>
    {/if}
    <button on:click={() => {
        $heldAvatar = null;
    }} class="close">
        完了
        <i class="ti ti-check"></i>
    </button>
</div>
<button on:click={() => {
    $heldAvatar = null;
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
        right: 6rem;
        bottom: 2rem;
        color: var(--color-bg-1);
    }

    .close {
        background: var(--color-1);
        color: var(--color-bg-2);
        outline: 1px solid var(--color-bg-2);
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
            outline-offset: -1px;
        }
    }

    .message {
        position: absolute;
        left: 50%;
        top: calc(50% + 12rem);
        transform: translate(-50%, 0);
        padding: 0.25rem 1rem;
        font-size: 1rem;
        font-weight: 600;
        white-space: nowrap;
        color: var(--color-1);
        background: var(--color-bg-2);
        pointer-events: none;
    }

    .png-avatar {
        height: 4rem;
        object-fit: contain;
    }
</style>
