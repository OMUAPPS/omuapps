<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { isBetaEnabled } from '$lib/settings.js';
    import { VERSION } from '$lib/version.js';
    import { DEV } from 'esm-env';
</script>

<div class="info">
    <h2>
        <i class="ti ti-letter-v"></i>
        {$t('settings.about.version')}
    </h2>
    <p class="version">
        {VERSION}
        {#if DEV}
            <span class="tag">DEV</span>
        {/if}
        {#if $isBetaEnabled}
            <span class="tag">BETA</span>
        {/if}
    </p>
</div>

<style lang="scss">
    .info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .version {
        display: flex;
        gap: 0.25rem;
        align-items: flex-start;
    }

    .tag {
        background: var(--color-bg-1);
        color: var(--color-1);
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }
</style>
