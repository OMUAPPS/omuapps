<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { tauriWindow } from '$lib/tauri.js';
    import { App } from '@omujs/omu';
    import type { Registry } from '@omujs/omu/api/registry';
    import { Button, Textbox } from '@omujs/ui';
    import { LogicalSize } from '@tauri-apps/api/window';
    import type { Writable } from 'svelte/store';
    const appWindow = tauriWindow.getCurrentWindow();

    function makeRegistryWritable<T>(registry: Registry<T>): Writable<T> {
        return {
            set: (value: T) => {
                registry.set(value);
            },
            subscribe: (run) => {
                const unlisten = registry.listen(run);
                run(registry.value);
                return unlisten;
            },
            update: (fn) => {
                registry.update(fn);
            },
        };
    }

    const trustedHosts = makeRegistryWritable(omu.server.trustedHosts);
    let srcHost = '';
    let dstHost = '';

    function resetWindowSize() {
        appWindow.setSize(new LogicalSize(1280, 720));
    }
</script>

<h3>Trusted Hosts</h3>
<section>
    {JSON.stringify($trustedHosts)}
    <span>
        src
        <Textbox bind:value={srcHost} />
    </span>
    <span>
        dst
        <Textbox bind:value={dstHost} />
    </span>
    <Button onclick={() => {
        $trustedHosts[srcHost] = dstHost;
    }}>
        追加
        <i class="ti ti-plus"></i>
    </Button>
</section>

<h3>Settings</h3>
<section>
    <button
        on:click={() => {
            window.localStorage.clear();
        }}
    >
        Clear Settings
    </button>
</section>

<h3>Permissions</h3>
<section>
    <button
        on:click={() => {
            dashboard.handlePermissionRequest({
                kind: 'app/permissions',
                app: App.serialize(omu.app),
                permissions: [
                    {
                        id: 'test:test',
                        metadata: {
                            level: 'high',
                            name: 'Test Permission',
                        },
                    },
                ],
                id: 'test',
            });
        }}
    >
        Request Test Permission
    </button>
</section>

<h3>Window</h3>
<section>
    <button on:click={resetWindowSize}> Reset Window Size </button>
</section>

<h3>Server</h3>
<section>
    <button
        on:click={() => {
            omu.server.shutdown();
        }}
    >
        Stop Server
    </button>
</section>

<style lang="scss">
    h3 {
        margin-bottom: 0.5rem;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .origin {
        display: flex;
        gap: 0.5rem;
    }

    input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--color-outline);
    }

    .add {
        padding: 0.5rem;
        border: 1px solid var(--color-outline);
        cursor: pointer;
        width: 2.25rem;
        height: 2.25rem;
    }
</style>
