<script lang="ts">
    import { omu } from '$lib/client';
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { t } from '$lib/i18n/i18n-context';
    import type { AppInstallRequest } from '@omujs/omu/api/dashboard';
    import { ExternalLink } from '@omujs/ui';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: AppInstallRequest;
            resolve: (accept: boolean) => void;
        };
    };
    const {
        request: { app },
        resolve,
    } = screen.props;

    function accept() {
        resolve(true);
        screen.handle.pop();
    }

    function reject() {
        resolve(false);
        screen.handle.pop();
    }
</script>

<Screen {screen} disableClose>
    <div class="header">
        <AppInfo app={app} />
        <p>を追加しますか？</p>
    </div>
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
    </div>
    <div class="actions">
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button on:click={accept} class="accept">
            追加
            <i class="ti ti-check"></i>
        </button>
    </div>
</Screen>

<style lang="scss">
    .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding: 2rem 1.25rem;
        padding-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 0.5rem;
        padding: 1rem 1.621rem;
        margin-top: 2rem;

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

    .actions {
        display: flex;
        margin-top: auto;
        margin-bottom: 4rem;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        width: 100%;
        border-top: 1px solid var(--color-outline);

        > button {
            border: none;
            padding: 0.5rem 1rem;
            font-weight: 600;
            color: var(--color-1);
            background: var(--color-bg-1);
            cursor: pointer;
            border-radius: 4px;
            flex: 1;

            &.reject {
                color: var(--color-text);
                background: var(--color-bg-1);
            }

            &.accept {
                background: var(--color-1);
                color: var(--color-bg-1);

                &:disabled {
                    background: var(--color-bg-1);
                    color: var(--color-1);
                }
            }
        }
    }
</style>
