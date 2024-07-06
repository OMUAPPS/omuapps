<script lang="ts">
    import { TauriEvent } from '@tauri-apps/api/event';
    import { onDestroy } from 'svelte';
    import StatusBar from './common/StatusBar.svelte';
    import ScreenRenderer from './common/screen/ScreenRenderer.svelte';
    import ButtonClose from './common/titlebar/ButtonClose.svelte';
    import ButtonMaximize from './common/titlebar/ButtonMaximize.svelte';
    import ButtonMinimize from './common/titlebar/ButtonMinimize.svelte';
    import Title from './images/title.svg';
    import { listen, tauriWindow } from './utils/tauri.js';

    let maximized = false;

    const destroy = listen(TauriEvent.WINDOW_RESIZED, async () => {
        maximized = await tauriWindow.appWindow.isMaximized();
    });
    onDestroy(async () => (await destroy)());
</script>

<div class="window">
    <div class="titlebar">
        <div data-tauri-drag-region class:margin={!maximized} />
        <div class="title">
            <img src={Title} alt="title" width="64" height="10" />
            <StatusBar />
        </div>
        <div class="buttons">
            <ButtonMinimize />
            <ButtonMaximize />
            <ButtonClose />
        </div>
    </div>
    <div class="content">
        <slot />
    </div>
    <ScreenRenderer />
</div>

<style lang="scss">
    div[data-tauri-drag-region] {
        -webkit-app-region: drag;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 40px;

        &.margin {
            $drag-margin: 5px;
            position: absolute;
            top: $drag-margin;
            left: $drag-margin;
            width: calc(100% - $drag-margin * 2);
            height: 40px - $drag-margin;
        }
    }

    .buttons {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        flex-direction: row;
    }

    .titlebar {
        position: relative;
        top: 0;
        left: 0;
        z-index: 1000;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100vw;
        height: 40px;
        user-select: none;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        outline-offset: -1px;
    }

    .title {
        position: absolute;
        display: flex;
        flex-direction: row;
        gap: 10px;
        align-items: center;
        justify-content: center;
        margin-left: 10px;
        pointer-events: none;
    }

    .window {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        outline-offset: -1px;
    }

    .content {
        position: absolute;
        top: 40px;
        width: 100%;
        height: calc(100% - 40px);
        overflow: hidden;
        background: var(--color-bg-2);
    }
</style>
