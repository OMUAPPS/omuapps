<script lang="ts">
    import { getSetting } from '$lib/helper.js';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, Button, ExternalLink, setGlobal, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { MarshmallowAPI, MarshmallowSession } from './api.js';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { MarshmallowApp } from './marshmallow-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    new MarshmallowApp(omu);
    setGlobal({ omu, obs });

    const agreed = getSetting(APP.join('agreed'), false);

    let state: {
        type: 'agreements';
        accept: () => void;
    } | {
        type: 'loading';
        logout?: boolean;
    } | {
        type: 'ready';
        api: MarshmallowAPI;
    } | {
        type: 'failed';
        kind: 'login' | 'host';
        retry: () => void;
    } = { type: 'loading' };

    async function init() {
        if (!$agreed) {
            await new Promise<void>((resolve) => {
                state = {
                    type: 'agreements',
                    accept: () => resolve(),
                };
            });
            $agreed = true;
        }
        if (state.type !== 'loading') {
            state = { type: 'loading' };
        }
        await omu.waitForReady();
        while (true) {
            let session: MarshmallowSession | undefined = undefined;
            if (state.logout) {
                session = await MarshmallowSession.login(omu);
            } else {
                session = await MarshmallowSession.get(omu) ?? await MarshmallowSession.login(omu);
            }
            if (!session) {
                console.warn('Failed to get session');
                await new Promise<void>((resolve) => {
                    state = {
                        type: 'failed',
                        kind: 'login',
                        retry: () => resolve(),
                    };
                });
                state = { type: 'loading' };
                continue;
            }
            const api = MarshmallowAPI.new(omu, session);
            state = {
                type: 'ready',
                api,
            };
            break;
        }
    }

    async function logout() {
        state = { type: 'loading', logout: true };
        init();
    }

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            OmuPermissions.DASHBOARD_WEBVIEW_PERMISSION_ID,
            OmuPermissions.DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
        );
        omu.start();
        init();
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
</svelte:head>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#if state.type === 'agreements'}
        <div class="screen">
            <div class="content">
                <h2>このアプリについて</h2>
                <p>本アプリは、株式会社Diver Downが提供するサービス</p>
                <p>
                    <ExternalLink href="https://marshmallow-qa.com/">
                        マシュマロ
                        <i class="ti ti-external-link"></i>
                    </ExternalLink>
                    の<b>非公式クライアントアプリ</b>です。公式アプリケーションではありませんので、ご注意ください。
                </p>
                <p>
                    ご利用に際しては、
                    <ExternalLink href="https://marshmallow-qa.com/terms/service">
                        マシュマロの利用規約
                        <i class="ti ti-external-link"></i>
                    </ExternalLink>
                    および
                    <ExternalLink href="https://marshmallow-qa.com/terms/privacy">
                        プライバシーポリシー
                        <i class="ti ti-external-link"></i>
                    </ExternalLink>
                    に従ってご利用ください。
                </p>
                <p>
                    本アプリはOMUAPPS開発貢献者が開発・保守を行っています。マシュマロの公式サポート対象外であることをあらかじめご了承の上、ご利用ください。
                </p>
                <small>
                    不具合のお問い合わせは、マシュマロではなく、
                    <ExternalLink href="https://omuapps.com/redirect/discord">
                        OMUAPPSのサポート
                        <i class="ti ti-external-link"></i>
                    </ExternalLink>
                    までお願いいたします。
                </small>
                <small>
                    また、株式会社Diver Downの提供するマシュマロに同等の機能が追加された場合、本アプリからは予告なくその機能を削除する可能性があります。
                </small>
            </div>
            <Button primary onclick={state.accept}>
                同意する
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {:else if state.type === 'loading'}
        <div class="screen">
            <Spinner />
        </div>
    {:else if state.type === 'ready'}
        <App api={state.api} logout={logout} />
    {:else if state.type === 'failed'}
        <div class="screen">
            {#if state.kind === 'host'}
                <p>ホストの要求に失敗しました</p>
            {:else if state.kind === 'login'}
                <p>マシュマロにログインできませんでした</p>
            {/if}
            <Button primary onclick={state.retry}>再試行</Button>
        </div>
    {/if}
</AppPage>

<style lang="scss">
    .screen {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: left;
    }

    .content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        padding: 2rem;
        text-align: left;
    }

    small, p {
        display: block;
        max-width: 48rem;
        text-align: left;
        line-break: anywhere;
    }

    p {
        padding-bottom: 0.5rem;
    }
    small {
        padding-bottom: 1rem;
    }

    h2 {
        margin-bottom: 1rem;
        color: var(--color-1);
        font-size: 1.5rem;
    }
</style>
