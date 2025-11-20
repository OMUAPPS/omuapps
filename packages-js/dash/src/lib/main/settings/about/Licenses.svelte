<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { LICENSES } from '$lib/license/license.js';
    import { ExternalLink } from '@omujs/ui';
    import SvelteMarkdown from 'svelte-markdown';

    let selectedLicense: string | undefined = $state();
</script>

<div class="container">
    <h2>
        <i class="ti ti-license"></i>
        {$t('settings.about.licenses')}
    </h2>
    {#each LICENSES as license (license.name)}
        {@const selected = selectedLicense === license.name}
        <button
            onclick={() => (selectedLicense = selected ? undefined : license.name)}
            class:selected
        >
            <div class="body">
                <h4>
                    {license.name}
                </h4>
                {license.license}
                {#if license.url}
                    <ExternalLink href={license.url}>
                        {license.url}
                    </ExternalLink>
                {/if}
                {#if selected && license.licenseText}
                    <div class="content">
                        <SvelteMarkdown
                            source={license.licenseText}
                            renderers={{
                                link: ExternalLink,
                            }}
                        />
                    </div>
                {/if}
            </div>
        </button>
    {/each}
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
    }

    h2 {
        margin-bottom: 1rem;
    }

    button {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        padding: 0.5rem 0;
        text-align: left;
        cursor: pointer;
        background: none;
        border: none;

        .body {
            padding-left: 1rem;
            font-size: 1rem;
        }

        &.selected,
        &:hover {
            .body {
                padding-left: 8px;
                border-left: 2px solid var(--color-1);
            }
        }
    }

    .content {
        margin-top: 1rem;
        font-size: 1rem;
        white-space: pre-wrap;
    }
</style>
