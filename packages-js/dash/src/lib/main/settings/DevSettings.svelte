<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { Registry } from '@omujs/omu/extension/registry/registry.js';
    import type { Writable } from 'svelte/store';

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
</script>

<h3>Trusted Origins</h3>
<section>
    {JSON.stringify($trustedOrigins)}
    {#each $trustedOrigins as origin}
        <div class="origin">
            <input type="text" bind:value={origin} />
            <button on:click={() => trustedOrigins.update((origins) => origins.filter((o) => o !== origin))}>
                <i class="ti ti-x" />
            </button>
        </div>
    {/each}
    <div class="origin">
        <input type="text" bind:value={newOrigin} />
        <button on:click={() => {
            $trustedOrigins = [...$trustedOrigins, newOrigin];
            newOrigin = '';
        }}>
            <i class="ti ti-plus" />
        </button>
    </div>
</section>

<style lang="scss">
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

    button {
        padding: 0.5rem;
        border: 1px solid var(--color-outline);
        cursor: pointer;
        width: 2.25rem;
        height: 2.25rem;
    }
</style>
