<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { AppHeader, ButtonMini, Combobox, Toggle } from '@omujs/ui';
    import { APP } from './app.js';
    import { config, omu } from './client.js';
    import { LANGUAGE_OPTIONS } from './translator.js';

    $: console.log($config.languages);

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>

    {#await promise then }
        <main>
            <section>
                <small>オン/オフ</small>
                <Toggle bind:value={$config.active} />
            </section>
            <h3>翻訳言語</h3>
            <section>
                {#each $config.languages as language, i}
                    <div class="lang">
                        <Combobox options={LANGUAGE_OPTIONS} bind:value={language} />
                        <ButtonMini
                            on:click={() => {
                                $config = {
                                    ...$config,
                                    languages: $config.languages.filter((_, j) => i !== j),
                                };
                            }}
                        >
                            <i class="ti ti-x"></i>
                        </ButtonMini>
                    </div>
                {/each}
                <ButtonMini
                    on:click={() => {
                        $config = { ...$config, languages: [...$config.languages, 'ja'] };
                    }}
                >
                    言語を追加
                    <i class="ti ti-plus"></i>
                </ButtonMini>
            </section>
        </main>
    {/await}
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        height: 100%;
        padding: 40px;
    }

    h3 {
        color: var(--color-1);
        margin-bottom: 10px;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: start;
        justify-content: flex-start;
        width: min(100%, 300px);
        padding: 20px;
        margin-bottom: 20px;
        background: var(--color-bg-2);
        color: var(--color-1);
    }

    .lang {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>
