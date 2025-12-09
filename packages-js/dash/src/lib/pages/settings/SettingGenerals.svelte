<script lang="ts">
    import { omu } from '$lib/client';
    import { LOCALES } from '$lib/i18n/i18n';
    import { t } from '$lib/i18n/i18n-context';
    import { pushScreen } from '$lib/screen/screen';
    import ScreenCleaningEnvironment from '$lib/screen/ScreenCleanEnvironment.svelte';
    import ScreenUninstall from '$lib/screen/ScreenUninstall.svelte';
    import ScreenUpdate from '$lib/screen/ScreenUpdate.svelte';
    import { devMode, isBetaEnabled, language, openLinkMode, speechRecognition } from '$lib/settings';
    import { checkUpdate } from '$lib/tauri';
    import { Button, Combobox } from '@omujs/ui';
    import { invoke } from '@tauri-apps/api/core';
    import { Update } from '@tauri-apps/plugin-updater';
    import SettingLaunchMode from './_components/SettingLaunchMode.svelte';

    async function restartServer() {
        if (omu.ready) {
            omu.server.shutdown(true);
        } else {
            await invoke('start_server');
        }
        if (omu.running) {
            omu.stop();
        }
        omu.start();
        await new Promise<void>((resolve) => omu.onReady(resolve));
        window.location.reload();
    }

</script>

{#await checkUpdate() then update}
    {#if update}
        <span class="update">
            <div class="info">
                <p>
                    {$t('settings.setting.newVersionAvailable')}
                </p>
                <small>
                    {update.currentVersion} → {update.version}
                    {#if update.date}
                        <!-- 2025-02-06 16:47:41.775 +00:00:00 -->
                        <!-- remove seconds in tz offset -->
                        {@const isoDate = update.date.replace(/:\d{2}$/, ' ')}
                        {@const date = new Date(isoDate)}
                        ({date.toLocaleDateString()})
                    {/if}
                </small>
            </div>
            <Button primary onclick={() => {
                pushScreen<{ update: Update }>(ScreenUpdate, 'settings', { update });
            }}>
                {$t('settings.setting.update')}
                <i class="ti ti-arrow-up"></i>
            </Button>
        </span>
    {/if}
{:catch error}
    <span class="update">
        <p>{$t('settings.setting.checkUpdateError', { error })}</p>
    </span>
{/await}

<svelte:boundary>
    <SettingLaunchMode />
    {#snippet failed(error)}
        <small>起動設定の取得に失敗: {error}</small>
    {/snippet}
</svelte:boundary>
<span class="setting">
    <p>{$t('settings.setting.link')}</p>
    <Combobox
        bind:value={$openLinkMode}
        options={{
            browser: {
                value: 'browser',
                label: $t('settings.setting.link_browser'),
            },
            window: {
                value: 'window',
                label: $t('settings.setting.link_window'),
            },
        }}
    />
</span>
<span class="setting">
    <p>{$t('settings.setting.language')}</p>
    <Combobox
        bind:value={$language}
        options={Object.fromEntries(
            Object.entries(LOCALES).map(([key, value]) => [
                key,
                { value: value.code, label: value.name },
            ]),
        )}
    />
</span>
<label class="setting">
    <p>{$t('settings.setting.speechRecognition')}</p>
    <input
        type="checkbox"
        bind:checked={$speechRecognition}
    />
</label>
<span class="setting">
    拒否した確認をリセット
    <Button onclick={async () => {
        await omu.dashboard.clearBlockedPrompts();
    }} primary>
        リセット
    </Button>
</span>
<small>アプリのデータをすべて削除し完全なアンインストールをします</small>
<span class="setting">
    <Button primary onclick={() => {
        pushScreen<undefined>(
            ScreenUninstall,
            'settings',
            undefined,
        );
    }}>
        {$t('settings.setting.uninstall')}
    </Button>
</span>
<h3>
    {$t('settings.setting.debug')}
</h3>
<span class="setting">
    <Button primary onclick={restartServer}>
        {#snippet children({ promise })}
            {#if promise}
                {#await promise}
                    {$t('settings.setting.serverRestarting')}
                {:then}
                    {$t('settings.setting.serverRestarted')}
                {:catch error}
                    {$t('settings.setting.serverRestartError', {
                        error: JSON.stringify(error),
                    })}
                {/await}
            {:else}
                {$t('settings.setting.serverRestart')}
            {/if}
        {/snippet}
    </Button>
</span>
<span class="setting">
    <Button primary onclick={() => invoke('generate_log_file')}>
        {#snippet children({ promise })}
            {#if promise}
                {#await promise}
                    {$t('settings.setting.logFileGenerating')}
                {:catch error}
                    {$t('settings.setting.logFileGenerateError', {
                        error,
                    })}
                {/await}
            {:else}
                {$t('settings.setting.logFileGenerate')}
            {/if}
        {/snippet}
    </Button>
</span>
<small>先にOBSを終了する必要があります</small>
<span class="setting clean-environment">
    <Button primary onclick={() => {
        pushScreen<undefined>(
            ScreenCleaningEnvironment,
            'settings',
            undefined,
        );
    }}>
        {$t('settings.setting.cleanEnvironment')}
    </Button>
</span>
<label class="setting">
    <p>{$t('settings.setting.betaMode')}</p>
    <input
        type="checkbox"
        bind:checked={$isBetaEnabled}
    />
</label>
<small>開発者モードはアプリを開発するためにあります。必要でない場合に有効にすることは安全機能が一つ外れることを意味しますので理解したうえで使用してください</small>
<label class="setting">
    <p>{$t('settings.setting.devMode')}</p>
    <input type="checkbox" bind:checked={$devMode} />
</label>

<style lang="scss">
    .setting {
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: min(26rem, 100%);
        padding: 0.75rem;

        &:hover {
            background: var(--color-bg-1);
        }

        > input {
            width: 1.25rem;
            height: 1.25rem;
            accent-color: var(--color-1);

            &:hover {
                accent-color: var(--color-1);
            }
        }
    }

    .update {
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 2rem;
        border: 1px solid var(--color-1);
        padding: 2rem;
        color: var(--color-1);
        background: var(--color-bg-1);
        white-space: nowrap;
        border-radius: 2px;

        > .info {
            > p {
                font-size: 1rem;
                font-weight: 600;
                margin-bottom: 0.25rem;
            }

            > small {
                font-size: 0.7621rem;
                color: var(--color-text);
            }
        }
    }

    small {
        padding: 0 0.75rem;
        margin-top: 1rem;
        margin-bottom: 0.25rem;
    }

    h3 {
        margin-top: 2rem;
        margin-bottom: 0.5rem;
        padding: 0.75rem;
        color: var(--color-1);
        border-top: 1px solid var(--color-outline);
        padding-top: 1rem;
    }
</style>
