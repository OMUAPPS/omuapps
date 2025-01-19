<script lang="ts">
    import { DEV } from 'esm-env';
    import { isBetaEnabled } from '../settings.js';
    
    export const props = {};

    $: url = DEV ? 'http://localhost:5173/app/' :
        ($isBetaEnabled ? 'https://beta.omuapps.com/app/' : 'https://omuapps.com/app/');
</script>

<div class="container">
    <iframe src={url} title="" frameborder="0" allow="camera; microphone"></iframe>
    <div class="window-resize bottom" />
    <div class="window-resize right" />
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
