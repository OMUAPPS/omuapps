<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import {
        currentSettingsCategory,
        devMode,
    } from '$lib/settings';
    import { Header, Tooltip } from '@omujs/ui';
    import About from './SettingAbout.svelte';
    import DevSettings from './SettingDev.svelte';
    import SettingGenerals from './SettingGenerals.svelte';

    let { data }: { data: unknown } = $props();

</script>

<div class="container">
    <Header
        icon="ti-settings"
        title={$t('screen.settings.name')}
        subtitle={$t('screen.settings.description')}
    />
    <div class="content">
        <div class="categories">
            {#snippet category(id: string, set: () => void)}
                <button
                    class:selected={$currentSettingsCategory == id}
                    onclick={set}
                >
                    <Tooltip
                    >{$t(
                        `settings.category.${id}.description`,
                    )}</Tooltip
                    >
                    <span>
                        <i class="ti {$t(`settings.category.${id}.icon`)}"
                        ></i>
                        <p>{$t(`settings.category.${id}.name`)}</p>
                        <i class="ti ti-chevron-right"></i>
                    </span>
                </button>
            {/snippet}
            {@render category('general', () => ($currentSettingsCategory = 'general'))}
            {@render category('about', () => ($currentSettingsCategory = 'about'))}
            {#if $devMode}
                {@render category('developer', () => ($currentSettingsCategory = 'developer'))}
            {/if}
        </div>
        <div class="settings omu-scroll">
            <h2>
                {$t(`settings.category.${$currentSettingsCategory}.name`)}
                <small>
                    {$t(
                        `settings.category.${$currentSettingsCategory}.description`,
                    )}
                </small>
            </h2>

            {#if $currentSettingsCategory === 'general'}
                <SettingGenerals />
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
    }
</style>
