<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { PluginPackageInfo } from '@omujs/omu/extension/plugin/plugin-extension.js';

    export let entry: PluginPackageInfo;
</script>

<li class="package">
    <div class="info">
        <p>
            {entry.package}
        </p>
        <small>
            {entry.version}
        </small>
    </div>
    <div class="actions">
        <button on:click={() => {
            const url = `https://pypi.org/project/${entry.package}`;
            window.open(url, '_blank');
        }}>
            PyPi <i class="ti ti-external-link"></i>
        </button>
        <button on:click={() => {
            omu.plugins.reload({
                packages: [entry.package],
            });
        }}>
            Reload
            <i class="ti ti-reload"></i>
        </button>
    </div>
</li>

<style lang="scss">
    .package {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--color-outline);

        &:hover {
            > .actions {
                visibility: visible;
            }
        }
    }

    .info {
        p {
            color: var(--color-1);
            font-size: 1rem;
            font-weight: 600;
        }

        small {
            color: var(--color-text);
            font-size: 0.8rem;
            font-weight: 600;
        }
    }
    
    .actions {
        visibility: hidden;
        display: flex;

        button {
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
            margin-left: 0.5rem;
            padding: 0.5rem 1rem;
            border: none;
            color: var(--color-bg-1);
            background: var(--color-1);
            border-bottom: 1px solid var(--color-outline);
            border-radius: 3px;
            font-size: 0.8rem;
            font-weight: 600;
            white-space: nowrap;

            &:hover {
                background: var(--color-bg-2);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -2px;
            }
        }
    }
</style>
