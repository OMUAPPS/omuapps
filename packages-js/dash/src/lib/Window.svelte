<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { TauriEvent } from '@tauri-apps/api/event';
    import { DEV } from 'esm-env';
    import { onDestroy, onMount } from 'svelte';
    import TitlebarButton from './TitlebarButton.svelte';
    import StatusBar from './common/StatusBar.svelte';
    import Title from './images/title.svg';
    import { isBetaEnabled } from './main/settings.js';
    import ScreenRenderer from './screen/ScreenRenderer.svelte';
    import { appWindow, listen } from './tauri.js';
    import { VERSION } from './version.js';

    let alwaysOnTop = false;
    let maximized = false;

    const destroy = listen('single-instance', async ({ payload }) => {
        console.log(`single-instance: ${payload}`);
        const background =
            payload.args.includes('--background') ||
                payload.args.includes('-b');
        if (background) {
            return;
        }
        await appWindow.show();
        await appWindow.setFocus();
        window.location.reload();
    });

    onMount(async () => {
        maximized = await appWindow.isMaximized();
        window.addEventListener('resize', async () => {
            maximized = await appWindow.isMaximized();
        });
        listen(TauriEvent.WINDOW_RESIZED, async () => {
            maximized = await appWindow.isMaximized();
        });
    });

    onDestroy(async () => (await destroy)());

    async function togglePin() {
        alwaysOnTop = !alwaysOnTop;
        await appWindow.setAlwaysOnTop(alwaysOnTop);
    }

    async function minimize() {
        await appWindow.minimize();
    }

    async function maximize() {
        await appWindow.toggleMaximize();
        maximized = await appWindow.isMaximized();
    }

    async function close() {
        await appWindow.hide();
    }
</script>

<div class="window">
    <div class="titlebar">
        <div data-tauri-drag-region class:margin={!maximized}></div>
        <div class="title">
            <img src={Title} alt="title" width="64" height="10" />
            <span class="version">
                {VERSION}
                {(DEV && ' (dev)') || ($isBetaEnabled && ' (beta)') || ''}
            </span>
            <StatusBar />
        </div>
        <div class="buttons">
            <TitlebarButton
                on:click={togglePin}
                icon={alwaysOnTop ? 'ti-pinned-filled' : 'ti-pin'}
                tooltip={alwaysOnTop
                    ? $t('titlebar.pin-disable')
                    : $t('titlebar.pin-enable')}
            />
            <TitlebarButton
                on:click={minimize}
                icon="ti-minus"
                tooltip={$t('titlebar.minimize')}
            />
            <TitlebarButton
                on:click={maximize}
                icon={maximized ? 'ti-picture-in-picture-top' : 'ti-rectangle'}
                tooltip={$t(
                    `titlebar.${maximized ? 'unmaximize' : 'maximize'}`,
                )}
            />
            <TitlebarButton
                on:click={close}
                icon="ti-x"
                tooltip={$t('titlebar.close')}
            />
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

    .version {
        color: var(--color-1);
        font-size: 0.6rem;
        font-weight: 600;
        // upper alignment
        position: relative;
        top: -2px;
    }

    .title {
        position: absolute;
        display: flex;
        flex-direction: row;
        gap: 0.25rem;
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
