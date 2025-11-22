<script lang="ts">

    import { Omu, OmuPermissions } from '@omujs/omu';
    import {
        AssetButton,
        Button,
        Combobox,
        Slider,
    } from '@omujs/ui';
    import CaptionRenderer from './CaptionRenderer.svelte';
    import { ASSET_APP } from './app';
    import { CaptionApp, FONTS } from './caption-app.js';

    interface Props {
        omu: Omu;
        captionApp: CaptionApp;
    }

    let { omu, captionApp }: Props = $props();

    const { config } = captionApp;
    omu.dashboard.requestSpeechRecognition();

    $effect(() => {
        if ($config.style.fonts.length === 0) {
            $config.style.fonts = [
                {
                    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
                    family: 'Noto Sans JP',
                },
            ];
        }
    });

    $effect(() => {
        console.log($config.style.fonts[0]);
    });
</script>

<main>
    <div class="options omu-scroll">
        <h2>
            フォント
            <i class="ti ti-typography"></i>
        </h2>
        <section>
            <Combobox options={Object.fromEntries(FONTS.map((name) => {
                const url = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:ital,wght@0,400&directory=3&display=block`;
                return [name, {
                    value: {
                        family: name,
                        url,
                    },
                    label: name,
                }];
            }))} value={$config.style.fonts[0]} on:change={({ detail: { value } }) => {
                $config.style.fonts = [value];
            }} />
            <div>
                <div>
                    <small> フォントサイズ </small>
                    <Slider
                        min={10}
                        max={100}
                        step={1}
                        bind:value={$config.style.fontSize}
                    />
                    {$config.style.fontSize}
                </div>
                <div>
                    <small> フォントウェイト </small>
                    <Slider
                        min={100}
                        max={900}
                        step={100}
                        bind:value={$config.style.fontWeight}
                    />
                    {$config.style.fontWeight}
                </div>
            </div>
        </section>
        <h2>
            色
            <i class="ti ti-palette"></i>
            <Button primary onclick={() => {
                $config.style.color = '#0B6F72';
                $config.style.backgroundColor = '#FFFEFC';
            }}>
                色をリセット
                <i class="ti ti-reload"></i>
            </Button>
        </h2>
        <section>
            <div>
                <small> 背景色 </small>
                <input type="color" bind:value={$config.style.backgroundColor} />
            </div>
            <div>
                <small> 文字色 </small>
                <input type="color" bind:value={$config.style.color} />
            </div>
        </section>
        <h2>字幕</h2>
        <AssetButton asset={ASSET_APP} permissions={[
            OmuPermissions.DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        ]} />
    </div>
    <div class="preview">
        <h2>字幕のプレビュー</h2>
        <div class="renderer">
            <CaptionRenderer {captionApp} placeholder="字幕が表示されます" />
        </div>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: row;
        gap: 1rem;
        padding: 1rem;
    }

    .preview {
        flex: 1;
        display: flex;
        flex-direction: column;

        > .renderer {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
        }
    }

    .options {
        display: flex;
        flex-direction: column;
        width: 22rem;
        padding-right: 0.5rem;
        overflow-x: hidden;
    }

    h2 {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.5rem;

        > i {
            margin-right: auto;
        }
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--color-bg-2);
        margin-bottom: 1rem;
    }
</style>
