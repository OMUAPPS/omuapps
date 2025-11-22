<script lang="ts">
    import { run } from 'svelte/legacy';

    import type { Locale, LocalizedText } from '@omujs/omu/localization';
    import { BROWSER } from 'esm-env';
    import { onDestroy } from 'svelte';
    import { omu } from './stores.js';

    interface Props {
        text: LocalizedText | undefined;
    }

    let { text }: Props = $props();

    let displayText: string | undefined = $state(undefined);
    run(() => {
        if (BROWSER && text) {
            if ($omu.ready) {
                displayText = $omu.i18n.translate(text);
            } else {
                const locales = window.navigator.languages as Locale[];
                displayText = $omu.i18n.selectBestTranslation(locales, text);
                const unlisten = $omu.onReady(() => {
                    displayText = $omu.i18n.translate(text!);
                });
                onDestroy(unlisten);
            }
        }
    });
</script>

{#if displayText}
    {displayText}
{/if}
