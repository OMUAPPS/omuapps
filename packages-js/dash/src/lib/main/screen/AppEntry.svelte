<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { App } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';

    export let entry: App;
    const name = entry.metadata?.name
        ? omu.i18n.translate(entry.metadata?.name)
        : ''
</script>

<li>
    {name}
    <button on:click={() => dashboard.apps.remove(entry)}>
        <Tooltip>
            <span>{$t('general.delete')}</span>
        </Tooltip>
        <i class="ti ti-trash" />
    </button>
</li>
