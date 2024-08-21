<script lang="ts">
    import ScreenSettings from './settings/ScreenSettings.svelte';

    import { screenContext } from '$lib/common/screen/screen.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { Button, Tooltip } from '@omujs/ui';

    function openConnectScreen() {
        screenContext.push(ScreenSettings, undefined);
    }
</script>

<Button on:click={openConnectScreen}>
    <Tooltip>{$t('pages.settings')}</Tooltip>
    <i class="ti ti-settings" />
</Button>
