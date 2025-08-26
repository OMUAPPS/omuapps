<script lang="ts">
    import { appWindow } from "$lib/tauri";
    import type { App } from "@omujs/omu";
    import { Spinner } from "@omujs/ui";

    export let props: {
        app: App;
    };

    let loading = true;
</script>

<div class="container">
    <iframe
        on:load={() => {
            loading = false;
        }}
        src={props.app.url}
        title=""
        frameborder="0"
        allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
    ></iframe>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize bottom"
        on:mousedown={() => {
            appWindow.startResizeDragging("South");
        }}
    ></div>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize right"
        on:mousedown={() => {
            appWindow.startResizeDragging("East");
        }}
    ></div>
    {#if loading}
        <div class="loading">
            <Spinner />
        </div>
    {/if}
</div>

<style lang="scss">
    .container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        font-size: 1.5rem;
        padding: 1rem 1rem;
        color: var(--color-1);
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
