<script lang="ts">
    import Section from "$lib/components/Section.svelte";
    import { ChatPermissions } from "@omujs/chat";
    import { BrowserSession, Omu, OmuPermissions } from "@omujs/omu";
    import type { WebviewHandle } from "@omujs/omu/api/dashboard";
    import { AssetButton, Button } from "@omujs/ui";
    import Preview from "./_components/Preview.svelte";
    import { ASSET_APP, CHAT_OVERLAY_APP, HUD_APP } from "./app.js";
    import type { ChatOverlayApp } from "./chat-app.js";

    interface Props {
        omu: Omu;
        overlayApp: ChatOverlayApp;
    }

    let { omu, overlayApp }: Props = $props();
    const { config, session } = overlayApp;

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
        url.searchParams.set(
            BrowserSession.PARAM_NAME,
            JSON.stringify($session),
        );
        return url.toString();
    }

    let webview: WebviewHandle | undefined = $state();

    async function closeHud() {
        if (webview) {
            await webview.close();
        }
    }

    async function createHud() {
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
        webview.join().then(() => {
            $config.hud.startup = false;
        });
    }

    if ($config.hud.startup) {
        createHud();
    }
</script>

<main>
    <div class="menu">
        <Section name="オーバーレイ" icon="ti-image-in-picture">
            <label class="setting">
                <span>起動</span>
                <Button
                    primary
                    onclick={async () => {
                        if ($config.hud.startup) {
                            await omu.dashboard.apps.removeStartup(
                                CHAT_OVERLAY_APP,
                            );
                            await closeHud();
                        } else {
                            await omu.dashboard.apps.addStartup(
                                CHAT_OVERLAY_APP,
                            );
                            await createHud();
                        }
                        $config.hud.startup = !$config.hud.startup;
                    }}
                >
                    {#if $config.hud.startup}
                        自動起動を無効化
                    {:else}
                        起動
                    {/if}
                </Button>
            </label>
            <small>
                ディスプレイが一つでも、ゲームしながらでも邪魔をしないでチャットを表示できます
            </small>
        </Section>
        <Section name="配信に追加" icon="ti-arrow-bar-to-down">
            <AssetButton
                asset={ASSET_APP}
                permissions={[ChatPermissions.CHAT_PERMISSION_ID]}
                dimensions={{ width: 500, height: 400 }}
            />
        </Section>
    </div>
    <div class="preview">
        <Preview />
    </div>
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
        margin: 1rem;
        gap: 1rem;
    }

    .menu {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: 20rem;
    }

    small {
        color: var(--color-text);
    }

    section {
        background: var(--color-bg-2);
        padding: 1rem;
    }

    .setting {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
    }

    label {
        font-size: 0.9rem;
    }

    .preview {
        position: relative;
        flex: 1;
    }
</style>
