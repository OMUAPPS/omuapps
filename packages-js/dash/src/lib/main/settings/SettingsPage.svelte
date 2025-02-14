<script lang="ts">
    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { LOCALES } from '$lib/i18n/i18n.js';
    import { screenContext } from '$lib/screen/screen.js';
    import { checkUpdate, invoke } from '$lib/tauri.js';
    import { Button, Combobox, Header, Tooltip } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/plugin-process';
    import UpdateScreen from '../screen/UpdateScreen.svelte';
    import {
        currentSettingsCategory,
        devMode,
        isBetaEnabled,
        language,
    } from '../settings.js';
    import About from './about/About.svelte';
    import CleaningEnvironmentScreen from './CleaningEnvironmentScreen.svelte';
    import DevSettings from './DevSettings.svelte';
    import PluginSettings from './PluginSettings.svelte';

    export const props = {};

    async function restartServer() {
        if (omu.ready) {
            await omu.server.shutdown(true);
        }
        await new Promise<void>((resolve) => omu.onReady(resolve));
        window.location.reload();
    }

    async function updateConfig() {
        await invoke('set_config', {
            config: { enable_beta: $isBetaEnabled },
        });
        console.log('config', await invoke('get_config'));
        try {
            if (omu.ready) {
                await omu.server.shutdown();
            }
        } catch (e) {
            console.error(e);
        }
        await relaunch();
    }

    $: {
        $devMode &&= $isBetaEnabled;
    }
</script>

<div class="container">
    <Header
        icon="ti-settings"
        title={$t('screen.settings.name')}
        subtitle={$t('screen.settings.description')}
    />
    <div class="content">
        <div class="categories">
            <button
                class:selected={$currentSettingsCategory == 'general'}
                on:click={() => ($currentSettingsCategory = 'general')}
            >
                <Tooltip>{$t('settings.category.general.description')}</Tooltip>
                <span>
                    <i class="ti {$t('settings.category.general.icon')}"></i>
                    <p>{$t('settings.category.general.name')}</p>
                    <i class="ti ti-chevron-right"></i>
                </span>
            </button>
            <button
                class:selected={$currentSettingsCategory == 'about'}
                on:click={() => ($currentSettingsCategory = 'about')}
            >
                <Tooltip>{$t('settings.category.about.description')}</Tooltip>
                <span>
                    <i class="ti {$t('settings.category.about.icon')}"></i>
                    <p>{$t('settings.category.about.name')}</p>
                    <i class="ti ti-chevron-right"></i>
                </span>
            </button>
            {#if $isBetaEnabled}
                <button
                    class:selected={$currentSettingsCategory == 'plugins'}
                    on:click={() => ($currentSettingsCategory = 'plugins')}
                >
                    <Tooltip
                    >{$t('settings.category.plugins.description')}</Tooltip
                    >
                    <span>
                        <i class="ti {$t('settings.category.plugins.icon')}"
                        ></i>
                        <p>{$t('settings.category.plugins.name')}</p>
                        <i class="ti ti-chevron-right"></i>
                    </span>
                </button>
            {/if}
            {#if $devMode}
                <button
                    class:selected={$currentSettingsCategory == 'developer'}
                    on:click={() => ($currentSettingsCategory = 'developer')}
                >
                    <Tooltip
                    >{$t(
                        'settings.category.developer.description',
                    )}</Tooltip
                    >
                    <span>
                        <i class="ti {$t('settings.category.developer.icon')}"
                        ></i>
                        <p>{$t('settings.category.developer.name')}</p>
                        <i class="ti ti-chevron-right"></i>
                    </span>
                </button>
            {/if}
        </div>
        <div class="settings">
            <h2>
                {$t(`settings.category.${$currentSettingsCategory}.name`)}
                <small>
                    {$t(
                        `settings.category.${$currentSettingsCategory}.description`,
                    )}
                </small>
            </h2>

            {#if $currentSettingsCategory === 'general'}
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
                                screenContext.push(UpdateScreen, { update });
                            }}>
                                {$t('settings.setting.update')}
                                <i class="ti ti-arrow-up"></i>
                            </Button>
                        </span>
                    {/if}
                {:catch error}
                    <span class="update">
                        <p>{$t('settings.setting.checkUpdateError')}</p>
                        <small>{error}</small>
                    </span>
                {/await}
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
                    <p>{$t('settings.setting.betaMode')}</p>
                    <input
                        type="checkbox"
                        bind:checked={$isBetaEnabled}
                        on:change={async () => updateConfig()}
                    />
                </label>
                <small>
                    {$t('settings.setting.betaModeDescription')}
                </small>
                {#if $isBetaEnabled}
                    <label class="setting">
                        <p>{$t('settings.setting.devMode')}</p>
                        <input type="checkbox" bind:checked={$devMode} />
                    </label>
                {/if}
                <h3>
                    {$t('settings.setting.debug')}
                </h3>
                <span class="setting">
                    <Button primary onclick={restartServer} let:promise>
                        {#if promise}
                            {#await promise}
                                {$t('settings.setting.serverRestarting')}
                            {:then}
                                {$t('settings.setting.serverRestarted')}
                            {:catch error}
                                {$t('settings.setting.serverRestartError', {
                                    error,
                                })}
                            {/await}
                        {:else}
                            {$t('settings.setting.serverRestart')}
                        {/if}
                    </Button>
                </span>
                <span class="setting">
                    <Button primary onclick={() => invoke('generate_log_file')} let:promise>
                        {#if promise}
                            {#await promise}
                                {$t('settings.setting.logFileGenerating')}
                            {:then path}
                                {$t('settings.setting.logFileGenerated', {
                                    path,
                                })}
                            {:catch error}
                                {$t('settings.setting.logFileGenerateError', {
                                    error,
                                })}
                            {/await}
                        {:else}
                            {$t('settings.setting.logFileGenerate')}
                        {/if}
                    </Button>
                </span>
                <span class="setting clean-environment">
                    <Button primary onclick={() => {
                        screenContext.push(
                            CleaningEnvironmentScreen,
                            undefined,
                        );
                    }}>
                        {$t('settings.setting.cleanEnvironment')}
                    </Button>
                </span>
                <small>先にOBSを終了する必要があります</small>
            {:else if $currentSettingsCategory === 'plugins'}
                <PluginSettings />
            {:else if $currentSettingsCategory === 'about'}
                <About />
            {:else if $currentSettingsCategory === 'developer'}
                <DevSettings />
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .container {
        position: absolute;
        inset: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
    }

    .content {
        flex: 1;
        display: flex;
        background: var(--color-bg-1);
        overflow: hidden;
    }

    .categories {
        display: flex;
        flex-direction: column;
        width: 20rem;
        border-right: 1px solid var(--color-outline);
        margin: 1rem 0;
        padding: 0 0.5rem;
        gap: 2px;

        > button {
            display: flex;
            align-items: center;
            border: none;
            background: none;
            color: var(--color-text);
            font-size: 1rem;
            font-weight: 600;
            height: 3rem;
            padding: 0 1rem;

            &.selected {
                background: var(--color-bg-2);
                color: var(--color-1);
                border-right: 2px solid var(--color-1);
            }

            &:hover {
                background: var(--color-bg-2);
                transition: padding 0.0621s;

                > span > .ti-chevron-right {
                    color: var(--color-1);
                    padding-right: 0;
                    transition: padding 0.0621s;
                }
            }
        }

        > button > span {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            flex: 1;

            > .ti-chevron-right {
                margin-left: auto;
                color: transparent;
                padding-right: 0.25rem;
            }
        }
    }

    .settings {
        position: relative;
        background: var(--color-bg-2);
        margin: 1rem;
        padding: 2.25rem 2rem;
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;

        > h2 {
            border-bottom: 1px solid var(--color-1);
            padding-bottom: 0.5rem;
            margin-bottom: 3rem;
            color: var(--color-1);

            > small {
                margin-left: 0.5rem;
                color: var(--color-text);
                font-size: 0.7rem;
            }
        }

        > h3 {
            border-top: 1px solid var(--color-outline);
            padding-top: 1rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: var(--color-1);
        }
    }

    .settings > small {
        color: var(--color-text);
        font-size: 0.7rem;
        margin-bottom: 2rem;
        border-top: 1px solid var(--color-outline);
        width: fit-content;
        padding-top: 0.125rem;
        margin-top: 0.125rem;
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

    .setting {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        max-width: 20rem;
        margin-bottom: 0.25rem;
        margin-top: 0.5rem;
        color: var(--color-1);

        > input {
            width: 1.25rem;
            height: 1.25rem;
            accent-color: var(--color-1);

            &:hover {
                accent-color: var(--color-1);
            }
        }
    }
</style>
