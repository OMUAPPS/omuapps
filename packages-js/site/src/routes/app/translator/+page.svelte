<script lang="ts">
    import { browser } from '$app/environment';
    import { ProxyDictionaryLoader } from '$lib/token-helper';
    import kuromoji from '@2ji-han/kuromoji.js';
    import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
    import { Chat } from '@omujs/chat';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, setGlobal, Spinner } from '@omujs/ui';
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

    if (browser) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
        );
        omu.start();
    }

</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={TRANSLATOR_APP} />
        </header>
    {/snippet}
    {#if tokenizer}
        <App {app} {chat} {tokenizer} />
    {:else}
        <div class="loading">
            <p>辞書を読み込み中<Spinner /></p>
        </div>
    {/if}
</AppPage>

<style lang="scss">
    .loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        color: var(--color-1);

        > * {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--color-1);
        }
    }
</style>
