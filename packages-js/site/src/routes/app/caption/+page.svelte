<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import {
        AppHeader,
        Combobox,
        FlexRowWrapper,
        Popup,
        Textbox,
        setClient,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import CaptionRenderer from './CaptionRenderer.svelte';
    import { APP } from './app.js';
    import { CaptionApp } from './caption-app.js';
    import { FONTS, LANGUAGES_OPTIONS, type LanguageKey } from './types.js';

    export const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const captionApp = new CaptionApp(omu);
    setClient(omu);

    const { config } = captionApp;

    if (BROWSER) {
        const recognition = new (webkitSpeechRecognition ||
            SpeechRecognition)();
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.lang = $config.lang;
        config.subscribe((value) => {
            recognition.lang = value.lang;
            recognition.stop();
        });

        recognition.onresult = (event) => {
            const texts = [...event.results]
                .flatMap((result) => [...result])
                .map((result) => result.transcript);
            const final = event.results[event.results.length - 1].isFinal;
            captionApp.setCaption({ texts, final });
        };

        recognition.onend = () => {
            recognition.start();
        };

        recognition.start();

        omu.permissions.require(
            permissions.OBS_SOURCE_READ_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

    function resetLang() {
        $config.lang = window.navigator.language as LanguageKey;
    }

    $: {
        if ($config.style.fonts.length === 0) {
            $config.style.fonts = [
                {
                    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
                    family: 'Noto Sans JP',
                },
            ];
        }
    }
</script>

<svelte:head>
    <title>リアルタイム字幕</title>
    <meta name="description" content="リアルタイム字幕" />
</svelte:head>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <section>
        <h3>字幕</h3>
        <AssetButton {omu} {obs} />
    </section>
    <section>
        <h3>言語選択</h3>
        <FlexRowWrapper gap>
            <Combobox options={LANGUAGES_OPTIONS} bind:value={$config.lang} />
            {#if BROWSER && $config.lang !== window.navigator.language}
                <button on:click={resetLang}> 言語をリセット </button>
            {/if}
        </FlexRowWrapper>
    </section>
    <section>
        <FlexRowWrapper gap alignItems="end" between>
            <h3>フォント</h3>
            <button class="add-font">
                <Popup>
                    <div class="font-popup">
                        {#each FONTS as font}
                            <button
                                on:click={() => {
                                    $config.style.fonts = [
                                        ...$config.style.fonts,
                                        {
                                            family: font,
                                            url: `https://fonts.googleapis.com/css2?family=${font}:ital,wght@0,400&directory=3&display=block`,
                                        },
                                    ];
                                }}
                            >
                                <link
                                    rel="stylesheet"
                                    href={`https://fonts.googleapis.com/css2?family=${font}:ital,wght@0,400&directory=3&display=block&text=サンプルテキスト`}
                                />
                                <p
                                    style:font-family="{font}, sans-serif"
                                    style:font-size="1rem"
                                    style:line-height="1.5"
                                    style:margin="0"
                                    style:padding="0"
                                    style:display="inline-block"
                                >
                                    サンプルテキスト
                                </p>
                            </button>
                        {/each}
                    </div>
                </Popup>
                フォント追加
                <i class="ti ti-plus" />
            </button>
        </FlexRowWrapper>
        <div class="font-list">
            {#key $config.style.fonts}
                {#each $config.style.fonts as font, i}
                    <span class="font">
                        <span>
                            <small> ファミリー </small>
                            <Textbox bind:value={font.family} />
                        </span>
                        <span>
                            <small> URL </small>
                            <Textbox bind:value={font.url} />
                        </span>
                        <button
                            on:click={() => {
                                $config.style.fonts =
                                    $config.style.fonts.filter(
                                        (_, index) => index !== i,
                                    );
                            }}
                        >
                            削除
                            <i class="ti ti-x" />
                        </button>
                    </span>
                {/each}
            {/key}
        </div>
        <div>
            <div>
                <small> フォントサイズ </small>
                <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    bind:value={$config.style.fontSize}
                />
                {$config.style.fontSize}
            </div>
            <div>
                <small> フォントウェイト </small>
                <input
                    type="range"
                    min="100"
                    max="900"
                    step="100"
                    bind:value={$config.style.fontWeight}
                />
                {$config.style.fontWeight}
            </div>
        </div>
    </section>
    <section>
        <h3>
            <FlexRowWrapper gap alignItems="center">
                色
                <button
                    on:click={() => {
                        $config.style.color = '#0B6F72';
                        $config.style.backgroundColor = '#FFFEFC';
                    }}
                >
                    色をリセット
                    <i class="ti ti-reload" />
                </button>
            </FlexRowWrapper>
        </h3>
        <div>
            <small> 背景色 </small>
            <input type="color" bind:value={$config.style.backgroundColor} />
        </div>
        <div>
            <small> 文字色 </small>
            <input type="color" bind:value={$config.style.color} />
        </div>
    </section>
    <section class="preview">
        <small>字幕のプレビュー</small>
        <CaptionRenderer {captionApp} />
    </section>
</AppPage>

<style lang="scss">
    section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 2rem;
        color: var(--color-1);
    }

    .preview {
        position: relative;
        margin-top: 2rem;
        outline: 1px solid var(--color-1);
        background: var(--color-bg-2);
        min-height: 200px;
        height: 10rem;
    }

    .font-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .font {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        background: var(--color-bg-2);
        padding: 0.25rem 1rem;

        small {
            font-size: 0.7rem;
        }

        button {
            margin-left: auto;
            background: var(--color-bg-1);
        }

        &:hover {
            border-left: 2px solid var(--color-1);
        }
    }

    h3 {
        font-size: 1.1rem;
    }

    .add-font {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        background: var(--color-bg-2);
        width: fit-content;
        align-self: flex-end;
    }

    .font-popup {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        padding: 1rem;
        width: min(80vw, 600px);
        background: var(--color-bg-2);

        > button {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 0.2rem;
            margin: 0.2rem;
            align-items: center;
            outline: none;
            background: var(--color-bg-1);
        }
    }

    button {
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: 600;
        font-size: 0.8rem;
        outline: 1px solid var(--color-1);
        padding: 0.5rem 0.75rem;
        cursor: pointer;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        &:focus {
            outline: 2px solid var(--color-1);
        }
    }
</style>
