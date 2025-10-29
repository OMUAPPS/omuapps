<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, Button, setClient, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { MarshmallowAPI, MarshmallowSession } from './api.js';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { MarshmallowApp } from './marshmallow-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const marshmallow = new MarshmallowApp(omu);
    setClient(omu);

    let state: {
        type: 'loading';
    } | {
        type: 'ready';
        api: MarshmallowAPI;
    } | {
        type: 'failed';
        kind: 'login' | 'host';
        retry: () => void;
    } = { type: 'loading' };

    async function init() {
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
            const session = await MarshmallowSession.get(omu) ?? await MarshmallowSession.login(omu);
            if (!session) {
                console.warn('Failed to get session');
                await new Promise<void>((resolve) => {
                    state = {
                        type: 'failed',
                        kind: 'login',
                        retry: () => resolve(),
                    };
                });
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

    if (BROWSER) {
        omu.permissions.require(
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
    {#if state.type === 'loading'}
        <div class="screen">
            <Spinner />
        </div>
    {:else if state.type === 'ready'}
        <App {omu} {marshmallow} {obs} api={state.api} />
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
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        padding: 2rem;
        text-align: center;
    }
</style>
