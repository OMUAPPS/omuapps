<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { ExternalLink } from '@omujs/ui';
</script>

<div class="links">
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
</div>

<style lang="scss">
    .links {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: fit-content;
    }
</style>
