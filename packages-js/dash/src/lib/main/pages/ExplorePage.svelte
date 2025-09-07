<script lang="ts">
    import { appWindow } from '$lib/tauri.js';
    import { DEV } from 'esm-env';
    import { isBetaEnabled } from '../settings.js';

    export const props = {};

    function getExploreUrl(): string {
        if (DEV) {
            return 'http://localhost:5173/app';
        }
        if ($isBetaEnabled) {
            return 'https://beta.omuapps.com/app';
        } else {
            return 'https://omuapps.com/app';
        }
    }

    const url = getExploreUrl();
</script>

<div class="container">
    <iframe src={url} title="" frameborder="0" allow="camera; microphone"
    ></iframe>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize bottom"
        on:mousedown={() => {
            appWindow.startResizeDragging('South');
        }}
    ></div>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize right"
        on:mousedown={() => {
            appWindow.startResizeDragging('East');
        }}
    ></div>
</div>

<style lang="scss">
    .container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
    }

    .window-resize {
        position: absolute;
        bottom: 0;
        right: 0;
        border: none;
        background: none;

        &.bottom {
            left: 0;
            height: 5px;
            cursor: ns-resize;
        }

        &.right {
            top: 0;
            width: 5px;
            cursor: ew-resize;
        }
    }
</style>
