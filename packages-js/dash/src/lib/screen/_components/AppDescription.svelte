<script lang="ts">
    import { omu } from '$lib/client';
    import { t } from '$lib/i18n/i18n-context';
    import type { App } from '@omujs/omu';
    import { ExternalLink } from '@omujs/ui';

    interface Props {
        app: App;
    }

    let { app }: Props = $props();
</script>

<div class="info">
    {#if app.metadata}
        {@const {
            authors,
            description,
            license,
            repository,
            site,
            tags,
        } = app.metadata}
        {#if authors}
            <small>{$t('screen.app_install.info.authors')}</small>
            <p>{omu.i18n.translate(authors)}</p>
        {/if}
        {#if description}
            <small>{$t('screen.app_install.info.description')}</small>
            <p>{omu.i18n.translate(description)}</p>
        {/if}
        {#if license}
            <small>{$t('screen.app_install.info.license')}</small>
            <p>{omu.i18n.translate(license)}</p>
        {/if}
        {#if repository}
            <small>{$t('screen.app_install.info.repository')}</small>
            <p>
                <ExternalLink href={omu.i18n.translate(repository)}>
                    {omu.i18n.translate(repository)}
                </ExternalLink>
            </p>
        {/if}
        {#if site}
            <small>{$t('screen.app_install.info.site')}</small>
            <p>
                <ExternalLink href={omu.i18n.translate(site)}>
                    {omu.i18n.translate(site)}
                </ExternalLink>
            </p>
        {/if}
        {#if tags}
            <small>{$t('screen.app_install.info.tags')}</small>
            <p>{tags.map((tag) => omu.i18n.translate(tag)).join(', ')}</p>
        {/if}
    {/if}
    {#if app.url}
        <small>{$t('screen.app_install.info.url')}</small>
        <p>{app.url}</p>
    {/if}
</div>

<style lang="scss">
    .info {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 0.5rem;

        small {
            font-weight: 600;
            color: var(--color-1);
        }

        p {
            margin: 0;
            margin-bottom: 1rem;
            font-weight: 600;
            font-size: 0.8621rem;
            color: var(--color-text);
            text-align: left;
            line-break: anywhere;
        }
    }
</style>
