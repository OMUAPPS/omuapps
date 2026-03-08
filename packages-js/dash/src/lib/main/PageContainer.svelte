<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import ScreenRenderer from '$lib/screen/ScreenRenderer.svelte';
    import { currentPage } from '$lib/settings';
    import { Button } from '@omujs/ui';
    import * as tauriLog from '@tauri-apps/plugin-log';
    import { pages } from './page';
</script>

<div class="page-container">
    {#each Object.entries($pages) as [id, entry] (id)}
        {#key id}
            {#if entry.type === 'loaded'}
                <div class="page" class:visible={$currentPage === id} data-page-id={id}>
                    <svelte:boundary onerror={(error) => {
                        tauriLog.error(`Error loading page '${id}': ${JSON.stringify(error)}`);
                        console.error(`Error loading page '${id}':`, error);
                    }}>
                        <entry.page.component
                            data={entry.page.data}
                        />
                        {#snippet failed(error, reset)}
                            <div class="page-error">
                                <h2>
                                    {$t('main.page.loadError.title')}
                                </h2>
                                <p>
                                    {$t('main.page.loadError.message', {
                                        error: JSON.stringify(error),
                                    })}
                                </p>
                                <div class="actions">
                                    <Button onclick={reset} primary>
                                        {$t('main.page.loadError.retry')}
                                        <i class="ti ti-reload"></i>
                                    </Button>
                                </div>
                            </div>
                        {/snippet}
                    </svelte:boundary>
                </div>
            {/if}
        {/key}
    {/each}
    <ScreenRenderer />
</div>

<style lang="scss">

    .page {
        position: absolute;
        width: 100%;
        height: 100%;
        display: none;
        background: var(--color-bg-1);
        z-index: 1;

        &.visible {
            display: block;
        }
    }

    .page-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: var(--color-1);

        > h2 {
            margin-bottom: 1rem;
        }

        > p {
            margin-bottom: 2rem;
            color: var(--color-text);
        }
    }

    .page-container {
        position: relative;
        flex: 1;
        background: var(--color-bg-1);
    }
</style>
