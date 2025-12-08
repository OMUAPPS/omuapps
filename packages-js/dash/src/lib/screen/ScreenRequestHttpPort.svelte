<script lang="ts">
    import { App } from '@omujs/omu';
    import type { PromptRequestHttpPort, PromptResult } from '@omujs/omu/api/dashboard';
    import AppAgreementScreen from './AppAgreementScreen.svelte';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        props: {
            request: PromptRequestHttpPort;
            resolve: (accept: PromptResult) => void;
        };
    }

    let { handle, props }: Props = $props();
    const { request, resolve } = props;
</script>

<AppAgreementScreen {handle} app={App.deserialize(request.app)} {resolve}>
    <div class="header">
        <h3>アプリへのアクセスを要求</h3>
        <p>以下のアプリケーションへ接続しようとしています</p>
    </div>
    <div class="content omu-scroll">
        {#each request.processes as process, index (index)}
            <div class="process">
                <h2>{process.name}</h2>
                <div class="info">
                    <small>場所:</small>
                    <p>{process.exe}</p>
                    <small>ポート番号:</small>
                    <p>{process.port}</p>
                </div>
            </div>
        {/each}
    </div>
</AppAgreementScreen>

<style lang="scss">
    .header {
        margin: 0 1.25rem;
        text-align: left;
        margin-bottom: 1.25rem;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0 1rem;
    }

    h2 {
        color: var(--color-1);
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 0.5rem;
    }

    .process {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        text-align: left;
        padding: 1rem;
        background: var(--color-bg-1);

        > .info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: 0.8rem;
        }
    }
</style>
