<script lang="ts">
    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { LOCALES } from '$lib/i18n/i18n.js';
    import { screenContext } from '$lib/screen/screen.js';
    import { invoke } from '$lib/tauri.js';
    import { Combobox, Header, Tooltip } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/api/process';
    import { currentSettingsCategory, devMode, isBetaEnabled, language } from '../settings.js';
    import About from './about/About.svelte';
    import CleaningEnvironmentScreen from './CleaningEnvironmentScreen.svelte';
    import DevSettings from './DevSettings.svelte';
    import PluginSettings from './PluginSettings.svelte';

    export const props = {};

    let logPromise: Promise<string> | null = null;

    async function generateLogFile(): Promise<string> {
        let path: string;
        try {
            path = await invoke('generate_log_file');
        } catch (error) {
            setTimeout(() => logPromise = null, 3000);
            throw error;
        }
        logPromise = null;
        return path;
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
            <button class:selected={$currentSettingsCategory == 'general'} on:click={() => $currentSettingsCategory = 'general'}>
                <Tooltip>{$t('settings.category.general.description')}</Tooltip>
                <span>
                    <i class="ti {$t('settings.category.general.icon')}"></i>
                    <p>{$t('settings.category.general.name')}</p>
                    <i class="ti ti-chevron-right"></i>
                </span>
            </button>
            <button class:selected={$currentSettingsCategory == 'about'} on:click={() => $currentSettingsCategory = 'about'}>
                <Tooltip>{$t('settings.category.about.description')}</Tooltip>
                <span>
                    <i class="ti {$t('settings.category.about.icon')}"></i>
                    <p>{$t('settings.category.about.name')}</p>
                    <i class="ti ti-chevron-right"></i>
                </span>
            </button>
            {#if $isBetaEnabled}
                <button class:selected={$currentSettingsCategory == 'plugins'} on:click={() => $currentSettingsCategory = 'plugins'}>
                    <Tooltip>{$t('settings.category.plugins.description')}</Tooltip>
                    <span>
                        <i class="ti {$t('settings.category.plugins.icon')}"></i>
                        <p>{$t('settings.category.plugins.name')}</p>
                        <i class="ti ti-chevron-right"></i>
                    </span>
                </button>
            {/if}
            {#if $devMode}
                <button class:selected={$currentSettingsCategory == 'developer'} on:click={() => $currentSettingsCategory = 'developer'}>
                    <Tooltip>{$t('settings.category.developer.description')}</Tooltip>
                    <span>
                        <i class="ti {$t('settings.category.developer.icon')}"></i>
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
                    {$t(`settings.category.${$currentSettingsCategory}.description`)}
                </small>
            </h2>

            {#if $currentSettingsCategory === 'general'}
                <span class="setting">
                    <p>{$t('settings.setting.language')}</p>
                    <Combobox bind:value={$language} options={Object.fromEntries(Object.entries(LOCALES).map(([key, value]) => [key, {value: value.code, label: value.name}]))} />
                </span>
                <label class="setting">
                    <p>{$t('settings.setting.betaMode')}</p>
                    <input type="checkbox" bind:checked={$isBetaEnabled} on:change={async () => {
                        await invoke('set_config', {config: {enable_beta: $isBetaEnabled}});
                        console.log('config', await invoke('get_config'));
                        try {
                            await omu.server.shutdown();
                        } catch (e) {
                            console.error(e);
                        }
                        await relaunch();
                    }} />
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
                    <button on:click={() => {
                        omu.server.shutdown(true);
                        window.location.reload();
                    }}>{$t('settings.setting.serverRestart')}</button>
                </span>
                <span class="setting">
                    {#if logPromise}
                        {#await logPromise}
                            <button disabled>{$t('settings.setting.logFileGenerating')}</button>
                        {:then path}
                            <button>{$t('settings.setting.logFileGenerated', { path })}</button>
                        {:catch error}
                            <button>{$t('settings.setting.logFileGenerateError', { error })}</button>
                        {/await}
                    {:else}
                        <button on:click={() => logPromise = generateLogFile()}>{$t('settings.setting.logFileGenerate')}</button>
                    {/if}
                </span>
                <span class="setting clean-environment">
                    <button on:click={() => {
                        screenContext.push(CleaningEnvironmentScreen, undefined)
                    }}>{$t('settings.setting.cleanEnvironment')}</button>
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
    
    .setting {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        max-width: 20rem;
        margin-bottom: 0.25rem;
        margin-top: 0.5rem;
        color: var(--color-1);

        > button {
            border: none;
            background: var(--color-1);
            color: var(--color-bg-2);
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0.5rem 1rem;
            border-radius: 2px;
            cursor: pointer;

            &:focus-visible,
            &:hover {
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
                background: var(--color-bg-1);
                color: var(--color-1);
            }

            &:disabled {
                background: var(--color-bg-1);
                color: var(--color-1);
                cursor: not-allowed;
            }
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
</style>
