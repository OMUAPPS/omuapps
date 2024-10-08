<script lang="ts">
    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { LOCALES } from '$lib/i18n/i18n.js';
    import { invoke } from '$lib/tauri.js';
    import { Combobox, Header, Toggle, Tooltip } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/api/process';
    import { currentSettingsCategory, devMode, language } from '../settings.js';
    import About from './about/About.svelte';
    import DevSettings from './DevSettings.svelte';

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

    let isCleaning = false;

    async function cleanEnvironment(): Promise<void> {
        if (isCleaning) return;
        isCleaning = true;
        await omu.server.shutdown();
        await invoke('clean_environment');
        await relaunch();
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
                <i class="ti {$t('settings.category.general.icon')}" />
                <p>{$t('settings.category.general.name')}</p>
                <Tooltip>{$t('settings.category.general.description')}</Tooltip>
                <i class="ti ti-chevron-right" />
            </button>
            <button class:selected={$currentSettingsCategory == 'about'} on:click={() => $currentSettingsCategory = 'about'}>
                <i class="ti {$t('settings.category.about.icon')}" />
                <p>{$t('settings.category.about.name')}</p>
                <Tooltip>{$t('settings.category.about.description')}</Tooltip>
                <i class="ti ti-chevron-right" />
            </button>
            {#if $devMode}
                <button class:selected={$currentSettingsCategory == 'developer'} on:click={() => $currentSettingsCategory = 'developer'}>
                    <i class="ti {$t('settings.category.developer.icon')}" />
                    <p>{$t('settings.category.developer.name')}</p>
                    <Tooltip>{$t('settings.category.developer.description')}</Tooltip>
                    <i class="ti ti-chevron-right" />
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
                <span class="setting">
                    <p>{$t('settings.setting.devMode')}</p>
                    <Toggle bind:value={$devMode} />
                </span>
                <h3>
                    {$t('settings.setting.debug')}
                </h3>
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
                <small>先にOBSを終了する必要があります</small>
                <span class="setting">
                    {#if isCleaning}
                        <button disabled>{$t('settings.setting.cleaningEnvironment')}</button>
                    {:else}
                        <button on:click={cleanEnvironment}>{$t('settings.setting.cleanEnvironment')}</button>
                    {/if}
                </span>
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
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 0;
        background: var(--color-bg-2);
    }

    .content {
        position: absolute;
        inset: 0;
        top: 5rem;
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

        > button {
            border: none;
            background: none;
            height: 3rem;
            padding: 0 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--color-text);
            font-size: 1rem;
            font-weight: 600;

            > .ti-chevron-right {
                margin-left: auto;
                color: transparent;
                padding-right: 0.25rem;
            }

            &:hover {
                background: var(--color-bg-2);
                padding-left: 1.25rem;
                transition: padding 0.0621s;

                > .ti-chevron-right {
                    color: var(--color-1);
                    padding-right: 0;
                    transition: padding 0.0621s;
                }
            }

            &.selected {
                background: var(--color-bg-2);
                color: var(--color-1);
                border-right: 2px solid var(--color-1);
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
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: var(--color-1);
        }
    }
    
    .setting {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        max-width: 20rem;
        margin-bottom: 0.75rem;

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
    }
</style>
