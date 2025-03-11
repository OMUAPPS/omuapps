<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { Omu } from '@omujs/omu';
    import { FileDrop, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { REMOTE_APP } from '../app.js';
    import { RemoteApp } from '../remote-app.js';

    let token = BROWSER && $page.url.searchParams.get('token') || undefined;
    let lan = BROWSER && $page.url.searchParams.get('lan') || undefined;
    let secure = BROWSER && $page.url.searchParams.get('secure') === 'true' || false;
    const omu = new Omu(REMOTE_APP, {
        token: token,
        address: BROWSER && {
            host: lan || window.location.hostname,
            port: 26423,
            secure,
        } || undefined,
    });
    const remote = new RemoteApp(omu);
    setClient(omu);

    let lines: string[] = [];

    if (BROWSER) {
        onMount(async () => {
            try {
                omu.start();
            } catch (e) {
                lines.push(JSON.stringify(e));
            }
        });
    }
    let ready = false;
    omu.onReady(() => {
        ready = true;
    });
    omu.network.event.status.listen(value => {
        lines.push(JSON.stringify(value));
    });

    
</script>

{#if token}
    <AssetPage>
        {#if ready}
            <FileDrop handle={(files) => {
                const file = files[0];
                remote.upload(file);
            }}>
                <p>Drop file here</p>
            </FileDrop>
        {/if}
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}
{#if BROWSER}
    <p>{$page.url.searchParams.get('token')}</p>
    <p>{$page.url.searchParams.get('lan')}</p>
    <p>{$page.url.searchParams.get('secure')}</p>
{/if}
{lines.join('\n')}

<style>
    :global(body) {
        background: transparent !important;
    }
    </style>
