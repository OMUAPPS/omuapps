<script lang="ts">
    import AppWindow from '$lib/common/AppWindow.svelte';
    import { i18n } from '$lib/i18n/i18n-context.js';
    import { DEFAULT_LOCALE, LOCALES } from '$lib/i18n/i18n.js';
    import { language } from '$lib/settings.js';
    import { createI18nUnion, type I18n } from '@omujs/i18n';
    import '@omujs/ui';
    import { Theme } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import { onMount } from 'svelte';
    import FatalErrorWindow from './_components/FatalErrorWindow.svelte';
    import './styles.scss';

    const { children } = $props();

    async function init() {
        await loadLocale();

        language.subscribe(loadLocale);
    }

    async function loadLocale() {
        const langs: I18n[] = [];
        if (!LOCALES[$language]) {
            console.warn(`Locale ${$language} not found, falling back to ${DEFAULT_LOCALE}`);
            $language = DEFAULT_LOCALE;
        }
        langs.push(await LOCALES[$language].load());
        if ($language !== DEFAULT_LOCALE) {
            langs.push(await LOCALES[DEFAULT_LOCALE].load());
        }
        i18n.set(createI18nUnion(langs));
    }

    function formatError(e: unknown) {
        if (e instanceof Error) {
            return e.message;
        }
        return String(e);
    }

    onMount(async () => {
        try {
            await init();
            loadingState = { type: 'loaded' };
        } catch (err) {
            loadingState = { type: 'failed', message: formatError(err) };
        }
    });

    let loadingState: {
        type: 'initializing';
    } | {
        type: 'failed';
        message: string;
    } | {
        type: 'loaded';
    } = $state({ type: 'initializing' });
</script>

<svelte:head>
    <title>Dashboard</title>
    <Theme />
</svelte:head>

{#if loadingState.type === 'loaded'}
    <AppWindow>
        {@render children?.()}
    </AppWindow>
{:else if loadingState.type === 'failed'}
    <FatalErrorWindow message={loadingState.message} />
{/if}
