<script lang="ts">
    import { omu } from '$lib/client.js';
    import { tauriWindow } from '$lib/tauri.js';
    import { Button, Textbox } from '@omujs/ui';
    import { LogicalSize } from '@tauri-apps/api/window';
    const appWindow = tauriWindow.getCurrentWindow();

    const trustedHosts = omu.server.trustedHosts.compatSvelte();
    let srcHost = '';
    let dstHost = '';

    function resetWindowSize() {
        appWindow.setSize(new LogicalSize(1280, 720));
    }
</script>

<h3>アプリ開発用ホストマッピング</h3>
<section>
    <div class="mappings">
        {#each Object.entries($trustedHosts) as [src, dst] (src)}
            <div class="mapping">
                <div class="src">{src}</div>
                <i class="ti ti-chevron-right"></i>
                <div class="dst">{dst}</div>
                <Button onclick={() => {
                    delete $trustedHosts[src];
                    $trustedHosts = $trustedHosts;
                }}>
                    削除
                    <i class="ti ti-x"></i>
                </Button>
            </div>
        {/each}
    </div>
    <div class="mapping">
        <span>
            変換元
            <Textbox bind:value={srcHost} placeholder="http://..." />
        </span>
        <i class="ti ti-chevron-right"></i>
        <span>
            変換先
            <Textbox bind:value={dstHost} placeholder="https://..." />
        </span>
        <Button primary disabled={!srcHost || !dstHost} onclick={() => {
            $trustedHosts[srcHost] = dstHost;
        }}>
            追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
</section>

<h3>設定</h3>
<section>
    <Button onclick={() => {
        window.localStorage.clear();
    }} primary>
        管理画面の設定を削除
    </Button>
    <Button onclick={resetWindowSize} primary>ウィンドウサイズを初期化</Button>
    <Button onclick={() => {omu.server.shutdown();}} primary>
        サーバーを停止
    </Button>
</section>

<style lang="scss">
    h3 {
        margin-bottom: 0.5rem;
    }

    section {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2.5rem;
    }

    .mappings {
        display: flex;
        align-items: stretch;
        flex-direction: column;
        width: 100%;
        gap: 1px;
    }

    .mapping {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        background: var(--color-bg-1);
        padding: 0.5rem 0.5rem;
        outline: 1px solid var(--color-outline);
        width: 100%;

        > div {
            flex: 1;
            padding: 0 0;
        }
    }
</style>
