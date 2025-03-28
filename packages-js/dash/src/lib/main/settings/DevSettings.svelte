<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { tauriWindow } from '$lib/tauri.js';
    import { PermissionType } from '@omujs/omu/extension/permission/permission.js';
    import type { Registry } from '@omujs/omu/extension/registry/registry.js';
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

    const trustedOrigins = makeRegistryWritable(omu.server.trustedOrigins);
    let newOrigin = '';

    function resetWindowSize() {
        appWindow.setSize(new LogicalSize(1280, 720));
    }
</script>

<h3>Trusted Origins</h3>
<section>
    {JSON.stringify($trustedOrigins)}
    {#each $trustedOrigins as origin, i (i)}
        <div class="origin">
            <input type="text" bind:value={origin} />
            <button
                on:click={() =>
                    trustedOrigins.update((origins) =>
                        origins.filter((o) => o !== origin),
                    )}
                aria-label="Remove origin"
            >
                <i class="ti ti-x"></i>
            </button>
        </div>
    {/each}
    <div class="origin">
        <input type="text" bind:value={newOrigin} />
        <button
            on:click={() => {
                $trustedOrigins = [...$trustedOrigins, newOrigin];
                newOrigin = '';
            }}
            class="add"
            aria-label="Add origin"
        >
            <i class="ti ti-plus"></i>
        </button>
    </div>
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
                app: omu.app,
                permissions: [
                    PermissionType.fromJson({
                        id: 'test:test',
                        metadata: {
                            level: 'high',
                            name: 'Test Permission',
                        },
                    }),
                ],
                requestId: 'test',
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
