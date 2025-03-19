<script lang="ts">
    import { page } from '$app/stores';
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
    const remote = new RemoteApp(omu, 'remote');
    setClient(omu);

    let lines: string[] = [];

    if (BROWSER) {
        onMount(async () => {
            try {
                const res = await fetch('http://192.168.0.12:26423/version', {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                lines = [...lines, `response: ${await res.json()}`];
                lines = [...lines, `connecting to ${omu.address.host}:${omu.address.port}`];
                omu.start();
                lines = [...lines, 'started'];
            } catch (e) {
                lines = [...lines, `error: ${e}`];
            }
        });
    }
    let ready = false;
    omu.onReady(() => {
        ready = true;
    });
    omu.network.event.status.listen(value => {
        lines = [...lines, JSON.stringify(value)];
    });
</script>

{#if token}
    {#if ready}
        <FileDrop handle={(files) => {
            remote.upload(...files);
        }} multiple>
            <p>Drop file here</p>
        </FileDrop>
    {/if}
{:else}
    <p>id is not provided</p>
{/if}
{#if BROWSER}
    <p>{token}</p>
    <p>{lan}</p>
    <p>{secure}</p>
    <p>{ready}</p>
{/if}
{lines.join('\n')}

<style>
    :global(body) {
        background: transparent !important;
    }
</style>
