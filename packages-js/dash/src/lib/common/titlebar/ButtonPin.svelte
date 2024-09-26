<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { tauriWindow } from '$lib/utils/tauri.js';
    import { Tooltip } from '@omujs/ui';

    let alwaysOnTop = false;

    function toggle() {
        alwaysOnTop = !alwaysOnTop;
        tauriWindow.appWindow.setAlwaysOnTop(alwaysOnTop);
    }
</script>

<button
    class="button"
    class:enabled={alwaysOnTop}
    type="button"
    on:click={toggle}
>
    {#if alwaysOnTop}
        <Tooltip>{$t('titlebar.pin-disable')}</Tooltip>
        <i class="ti ti-pinned-filled" />
    {:else}
        <Tooltip>{$t('titlebar.pin-enable')}</Tooltip>
        <i class="ti ti-pin" />
    {/if}
</button>

<style lang="scss">
    .button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
        max-height: 100%;
        padding-right: 10px;
        padding-left: 10px;
        font-size: 16px;
        color: var(--color-1);
        background: transparent;
        border: none;
        outline: none;

        &:hover {
            color: var(--color-bg-2);
            background: var(--color-1);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }
</style>
