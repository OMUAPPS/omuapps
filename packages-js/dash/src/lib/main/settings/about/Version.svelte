<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { VERSION } from '$lib/version.js';
    import { FlexColWrapper } from '@omujs/ui';
    import { DEV } from 'esm-env';
</script>

<FlexColWrapper gap>
    <h2>
        <i class="ti ti-letter-v"></i>
        {$t('settings.about.version')}
    </h2>
    {VERSION}{DEV ? ' (dev)' : ''}
</FlexColWrapper>
