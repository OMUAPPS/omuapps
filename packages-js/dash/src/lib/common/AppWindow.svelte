<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { Tooltip, TooltipPortal } from '@omujs/ui';
    import { listen, TauriEvent } from '@tauri-apps/api/event';
    import { DEV } from 'esm-env';
    import { onDestroy, onMount } from 'svelte';
    import Title from '../images/title.svg';
    import ScreenRenderer from '../screen/ScreenRenderer.svelte';
    import { isBetaEnabled } from '../settings.js';
    import { appWindow } from '../tauri.js';
    import { VERSION } from '../version.js';

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    let alwaysOnTop = $state(false);
    let maximized = $state(false);

    const destroy = listen('single-instance', async ({ payload }) => {
        console.log(`single-instance: ${JSON.stringify(payload, null, 2)}`);
        const background = payload.args.includes('--background') || payload.args.includes('-b');
        if (background) {
            return;
        }
        await appWindow.show();
        await appWindow.setFocus();
    });

    onMount(async () => {
        maximized = await appWindow.isMaximized();
        window.addEventListener('resize', async () => {
            maximized = await appWindow.isMaximized();
        });
        listen(TauriEvent.WINDOW_RESIZED, async () => {
            maximized = await appWindow.isMaximized();
        });
        listen(TauriEvent.WINDOW_MOVED, async () => {
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
            <img src={Title} alt="title" />
            <span class="version">
                {VERSION}
                {(DEV && ' (dev)') || ($isBetaEnabled && ' (beta)') || ''}
            </span>
        </div>
        <div class="buttons">
            {#snippet button(icon: string, tooltip: string, onclick: () => void)}
                <button
                    class="button"
                    type="button"
                    {onclick}
                >
                    <Tooltip>{tooltip}</Tooltip>
                    <i class="ti {icon}"></i>
                </button>
            {/snippet}
            {@render button(
                alwaysOnTop ? 'ti-pinned-filled' : 'ti-pin',
                alwaysOnTop
                    ? $t('titlebar.pin-disable')
                    : $t('titlebar.pin-enable'),
                togglePin,
            )}
            {@render button(
                'ti-minus',
                $t('titlebar.minimize'),
                minimize,
            )}
            {@render button(
                maximized ? 'ti-picture-in-picture-top' : 'ti-rectangle',
                $t(`titlebar.${maximized ? 'unmaximize' : 'maximize'}`),
                maximize,
            )}
            {@render button(
                'ti-x',
                $t('titlebar.close'),
                close,
            )}
        </div>
    </div>
    <div class="content" tabindex="-1">
        {@render children?.()}
    </div>
    <ScreenRenderer />
    <TooltipPortal />
</div>

<style lang="scss">
    $height: 2.5rem;

    div[data-tauri-drag-region] {
        -webkit-app-region: drag;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: $height;

        &.margin {
            $drag-margin: 5px;
            position: absolute;
            top: $drag-margin;
            left: $drag-margin;
            width: calc(100% - $drag-margin * 2);
            height: calc($height - $drag-margin);
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
        height: $height;
        user-select: none;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        outline-offset: -1px;
    }

    .version {
        color: var(--color-1);
        font-size: 0.6rem;
        font-weight: 600;
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
        margin-left: 1rem;
        pointer-events: none;

        > img {
            height: 0.621rem;
        }
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
        top: $height;
        width: 100%;
        height: calc(100% - $height);
        overflow: hidden;
        background: var(--color-bg-2);
    }

    .button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        font-size: 1rem;
        color: var(--color-1);
        background: transparent;
        border: none;
        outline: none;

        &:focus-visible,
        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }
</style>
