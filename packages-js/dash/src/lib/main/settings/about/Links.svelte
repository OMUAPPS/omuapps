<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { ExternalLink, FlexColWrapper } from '@omujs/ui';
</script>

<FlexColWrapper gap>
    <h2>
        <i class="ti ti-link"></i>
        {$t('settings.about.links')}
    </h2>
    <ExternalLink href="https://github.com/OMUAPPS/omuapps">
        <h4>
            <i class="ti ti-brand-github"></i>
            {$t('settings.about.source_code')}
            <i class="ti ti-external-link"></i>
        </h4>
    </ExternalLink>
    <ExternalLink href="https://omuapps.com">
        <h4>
            <i class="ti ti-world"></i>
            {$t('settings.about.website')}
            <i class="ti ti-external-link"></i>
        </h4>
    </ExternalLink>
</FlexColWrapper>
