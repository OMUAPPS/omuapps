<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { getSetting } from '$lib/helper.js';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, Button, ExternalLink, setClient, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { MarshmallowAPI, MarshmallowSession } from './api.js';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { MarshmallowApp } from './marshmallow-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const marshmallow = new MarshmallowApp(omu);
    setClient(omu);

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
            const hostResult = await omu.dashboard.requestHost({
                host: 'marshmallow-qa.com',
            });
            if (hostResult.type !== 'ok') {
                console.warn('Failed to request host:', hostResult);
                await new Promise<void>((resolve) => {
                    state = {
                        type: 'failed',
                        kind: 'host',
                        retry: () => resolve(),
                    };
                });
                continue;
            }
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

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#if state.type === 'agreements'}
        <div class="screen">
            <h2>このアプリはマシュマロの非公式クライアントです</h2>
            <p>
                このアプリは株式会社Diver Downが提供している
                <ExternalLink href="https://marshmallow-qa.com/">
                    マシュマロ
                    <i class="ti ti-external-link"></i>
                </ExternalLink>
                の公式アプリケーションではなく、非公式に開発されたクライアントアプリです。利用にあたっては、マシュマロの利用規約およびプライバシーポリシーを遵守してください。
            </p>
            <p>
                また、このアプリはOMUAPPSコミュニティによって開発・保守されています。マシュマロの公式サポート対象外であることを理解した上で利用してください。
            </p>
            <small>
                不具合などが発生した場合はマシュマロではなく
                <ExternalLink href="https://omuapps.com/redirect/discord">
                    OMUAPPSのサポート
                    <i class="ti ti-external-link"></i>
                </ExternalLink>
                までご報告をお願いいたします。
            </small>
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
        <App {omu} {marshmallow} {obs} api={state.api} logout={logout} />
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
        gap: 1.5rem;
        padding: 2rem;
        text-align: center;
    }

    p {
        max-width: 40rem;
    }

    h2 {
        margin-bottom: 1rem;
        color: var(--color-1);
        font-size: 1.5rem;
    }
</style>
