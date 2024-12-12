<script lang="ts">
    import { onDestroy } from 'svelte';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';
    import { heldAvatar } from '../states.js';

    export let overlayApp: DiscordOverlayApp;
    const { config } = overlayApp;

    let lastMouse: {x: number, y: number} | null = null;
    let dragger: HTMLElement | null = null;
    
    function handleMouseMove(event: MouseEvent) {
        if (!lastMouse) return;
        const avatarConfig = $heldAvatar && $config.avatars[$heldAvatar];
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
    }

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });
</script>

<button
    bind:this={dragger}
    on:mousedown={handleMouseDown}
    on:wheel={handleMouseWheel}
    aria-label="Avatar Origin"
    class="origin"
></button>
<div class="actions">
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
</style>
