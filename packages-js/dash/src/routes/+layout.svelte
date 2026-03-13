<script lang="ts">
    import AppWindow from '$lib/common/AppWindow.svelte';
    import { language } from '$lib/settings.js';
    import { createI18nUnion, i18n, LOCALES, SYSTEM_LANGUAGE, type I18n } from '@omujs/i18n';
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
            console.warn(`Locale ${$language} not found, falling back to ${SYSTEM_LANGUAGE}`);
            $language = SYSTEM_LANGUAGE;
        }
        langs.push(LOCALES[$language].i18n);
        if ($language !== SYSTEM_LANGUAGE) {
            langs.push(LOCALES[SYSTEM_LANGUAGE].i18n);
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
