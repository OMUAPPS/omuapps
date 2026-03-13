<script lang="ts">
    import { browser } from '$app/environment';
    import { ProxyDictionaryLoader } from '$lib/token-helper';
    import kuromoji from '@2ji-han/kuromoji.js';
    import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
    import { Chat } from '@omujs/chat';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { setGlobal } from '@omujs/ui';
    import { TRANSLATOR_APP } from './app';
    import App from './App.svelte';
    import { TranslatorApp } from './translator-app';

    const omu = new Omu(TRANSLATOR_APP);
    const chat = Chat.create(omu);
    const app = new TranslatorApp(omu);
    setGlobal({ omu, chat });
    const url = 'https://github.com/OMUAPPS/assets/releases/download/dictionary/';

    let tokenizer: Tokenizer | undefined = $state();

    async function init() {
        const dictionary = await ProxyDictionaryLoader.fromURL(url, ((...params: Parameters<typeof window.fetch>) => omu.http.fetch(...params)) as typeof window.fetch);
        tokenizer = await kuromoji.fromDictionary(dictionary);
    }

    omu.onReady(() => {
        init();
    });

    // chat.messages.proxy((item) => {
    //     return item;
    // });

    if (browser) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
        );
        omu.start();
    }

</script>

{#if tokenizer}
    <App {app} {chat} {tokenizer} />
{:else}
    読み込み中
{/if}
