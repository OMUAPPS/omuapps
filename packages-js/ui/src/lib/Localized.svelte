<script lang="ts">
    import type { Locale, LocalizedText } from '@omujs/omu/localization';
    import { BROWSER } from 'esm-env';
    import { onDestroy } from 'svelte';
    import { client } from './stores.js';

    export let text: LocalizedText | undefined;

    let displayText: string | undefined = undefined;
    $: if (BROWSER && text) {
        if ($client.ready) {
            displayText = $client.i18n.translate(text);
        } else {
            const locales = window.navigator.languages as Locale[];
            displayText = $client.i18n.selectBestTranslation(locales, text);
            const unlisten = $client.onReady(() => {
                displayText = $client.i18n.translate(text!);
            });
            onDestroy(unlisten);
        }
    }
</script>

{#if displayText}
    {displayText}
{/if}
