<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { listen, tauriWindow } from '$lib/utils/tauri.js';
    import { Button, Tooltip } from '@omujs/ui';
    import { TauriEvent } from '@tauri-apps/api/event';
    import { onDestroy, onMount } from 'svelte';

    let maximized = false;

    async function maximize() {
        tauriWindow.appWindow.toggleMaximize();
        maximized = !(await tauriWindow.appWindow.isMaximized());
    }

    const destroy = listen(TauriEvent.WINDOW_RESIZED, async () => {
        maximized = await tauriWindow.appWindow.isMaximized();
    });
    onMount(async () => {
        maximized = await tauriWindow.appWindow.isMaximized();
    });
    onDestroy(async () => (await destroy)());
</script>

<Button on:click={maximize}>
    <Tooltip>
        {$t(`titlebar.${maximized ? 'unmaximize' : 'maximize'}`)}
    </Tooltip>
    <i class="ti ti-{maximized ? 'picture-in-picture-top' : 'rectangle'}" />
</Button>
