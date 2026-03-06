<script lang="ts">
    import { ChatPermissions } from '@omujs/chat';
    import { OBSPlugin } from '@omujs/obs';
    import { BrowserSession, Omu, OmuPermissions } from '@omujs/omu';
    import type { WebviewHandle } from '@omujs/omu/api/dashboard';
    import { AssetButton, Button } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { ASSET_APP, CHAT_OVERLAY_APP, HUD_APP } from './app.js';
    import type { ChatOverlayApp } from './chat-app.js';

    interface Props {
        omu: Omu;
        obs: OBSPlugin;
        chatOverlayApp: ChatOverlayApp;
    }

    let { omu, obs, chatOverlayApp }: Props = $props();
    const { session } = chatOverlayApp;

    async function generateUrl() {
        $session = await omu.sessions.generateToken({
            app: HUD_APP,
            permissions: [
                OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
                OmuPermissions.ASSET_PERMISSION_ID,
                ChatPermissions.CHAT_PERMISSION_ID,
            ],
        });
        const url = new URL(HUD_APP.url!);
        url.searchParams.set(BrowserSession.PARAM_NAME, JSON.stringify($session));
        return url.toString();
    }

    let webview: WebviewHandle | undefined = $state();

    async function createHud() {
        if (webview) {
            await webview.close();
        }
        webview = await omu.dashboard.requestWebview({
            url: await generateUrl(),
            always_on_top: true,
            shadow: false,
            center: true,
            decorations: false,
            transparent: true,
            maximizable: false,
            resizable: true,
            inner_size: {
                x: 300,
                y: 500,
            },
        });
    }

    createHud();

    let isStartupSet: undefined | boolean = $state();

    onMount(async () => {
        const apps = await omu.dashboard.apps.getStartupApps();
        isStartupSet = apps.has(CHAT_OVERLAY_APP.id.key());
    });
</script>

<main>
    <Button onclick={createHud}>
        create
    </Button>
    <p>
        <AssetButton asset={ASSET_APP} dimensions={{ width: 500, height: 400 }} />
    </p>
    {#if isStartupSet !== undefined}
        <Button primary onclick={async () => {
            if (isStartupSet) {
                await omu.dashboard.apps.removeStartup(CHAT_OVERLAY_APP);
            } else {
                await omu.dashboard.apps.addStartup(CHAT_OVERLAY_APP);
            }
            const apps = await omu.dashboard.apps.getStartupApps();
            isStartupSet = apps.has(CHAT_OVERLAY_APP.id.key());
        }}>
            {#if isStartupSet}
                自動起動を無効化
            {:else}
                自動起動を有効化
            {/if}
        </Button>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        margin: 1rem;
        gap: 1rem;
    }
</style>
