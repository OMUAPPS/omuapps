<script lang="ts">
    import type { App } from '@omujs/omu';
    import type { HostRequest, PromptResult } from '@omujs/omu/api/dashboard';
    import { ExternalLink } from '@omujs/ui';
    import AppAgreementScreen from './AppAgreementScreen.svelte';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        props: {
            request: HostRequest;
            app: App;
            resolve: (accept: PromptResult) => void;
        };
    }

    let { handle, props }: Props = $props();
    const { request, app, resolve } = props;
</script>

<AppAgreementScreen {handle} {app} {resolve}>
    <h2>
        <ExternalLink href={request.host}>
            {request.host}
            <i class="ti ti-external-link"></i>
        </ExternalLink>
    </h2>
    <p>
        へのアクセスを要求しています
    </p>
    <br>
    <ul>
        <li>これを許可するとこのアプリはそのサイトの認証情報を使ったり無制限のアクセスが可能になります。</li>
    </ul>
</AppAgreementScreen>

<style lang="scss">
    ul {
        text-align: left;
        padding: 0 3rem;
    }
</style>
