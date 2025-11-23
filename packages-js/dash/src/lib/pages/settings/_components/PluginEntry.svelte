<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { PluginPackageInfo } from '@omujs/omu/api/plugin';
    import { Button } from '@omujs/ui';

    interface Props {
        entry: PluginPackageInfo;
    }

    let { entry }: Props = $props();
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
        <Button
            primary
            onclick={() => {
                const url = `https://pypi.org/project/${entry.package}`;
                window.open(url, '_blank');
            }}
        >
            PyPi <i class="ti ti-external-link"></i>
        </Button>
        <Button
            primary
            onclick={() => {
                omu.plugins.reload({
                    packages: [entry.package],
                });
            }}
        >
            Reload
            <i class="ti ti-reload"></i>
        </Button>
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
        gap: 0.25rem;
    }
</style>
