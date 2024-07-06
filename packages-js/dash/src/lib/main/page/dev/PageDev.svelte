<script lang="ts">
    import AppEntry from './AppEntry.svelte';

    import { omu } from '$lib/client.js';
    import { i18n } from '$lib/i18n/i18n-context.js';
    import { invoke } from '$lib/utils/tauri.js';
    import { TableList } from '@omujs/ui';

    let starting = false;
    function start() {
        if (starting) return;
        starting = true;
        invoke('run_server')
            .then((res) => {
                console.log(`run_server: ${res}`);
            })
            .finally(() => {
                starting = false;
            });
    }

    function delete_runtime() {
        invoke('delete_runtime').then((res) => {
            console.log(`delete_runtime: ${res}`);
        });
    }

    function install_runtime() {
        invoke('install_runtime').then((res) => {
            console.log(`install_runtime: ${res}`);
        });
    }

    function update_libraries() {
        invoke('update_libraries').then((res) => {
            console.log(`update_libraries: ${res}`);
        });
    }

    function clearSettings() {
        window.localStorage.clear();
    }
</script>

<div class="container">
    <div class="section">
        <h3>Server</h3>
        <span>
            {omu.network.status}
            <small>
                {omu.network.address.host}:{omu.network.address.port}
            </small>
            <div>
                {starting ? 'starting' : 'stopped'}
                <button on:click={start}> start </button>
                <button
                    on:click={() => {
                        omu.server.shutdown();
                    }}
                >
                    stop
                </button>
                <button on:click={delete_runtime}>delete runtime</button>
                <button on:click={install_runtime}>install runtime</button>
                <button on:click={update_libraries}>update libraries</button>
                <button on:click={clearSettings}>clear settings</button>
            </div>
        </span>
    </div>
    <div class="section">
        <h3>Language</h3>
        <div>
            {$i18n?.localeName}
        </div>
    </div>
    <div class="section">
        <h3>Apps</h3>
        <div class="apps">
            <TableList table={omu.server.apps} component={AppEntry} />
        </div>
    </div>
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-flow: column;
        width: 100%;
        height: 100%;
        padding: 10px;
        overflow: auto;
        background: var(--color-bg-1);

        .section {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            height: fit-content;
            padding: 10px;
            margin-bottom: 10px;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
        }

        .apps {
            height: fit-content;
        }
    }
</style>
