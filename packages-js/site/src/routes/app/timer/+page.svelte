<script lang="ts">
    import { page } from '$app/stores';
    import AppPage from '$lib/components/AppPage.svelte';
    import { Omu } from '@omujs/omu';
    import {
        AppHeader,
        DragLink,
        FlexColWrapper,
        FlexRowWrapper,
        setClient,
        Textbox,
        Tooltip,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { TimerApp } from './timer-app.js';
    import Timer from './components/Timer.svelte';
    import Align from './components/Align.svelte';

    const omu = new Omu(APP);
    const timer = new TimerApp(omu);
    const { data, config } = timer;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <FlexColWrapper widthFull>
            <h3>タイム</h3>
            <section>
                <Timer {timer} />
            </section>

            <h3>操作</h3>
            <section>
                <FlexRowWrapper gap>
                    <button on:click={() => timer.toggle()}>
                        <Tooltip>
                            {#if $data.running}
                                タイマーを停止します
                            {:else}
                                タイマーを開始します
                            {/if}
                        </Tooltip>
                        {#if $data.running}
                            停止
                            <i class="ti ti-player-pause" />
                        {:else}
                            開始
                            <i class="ti ti-player-play" />
                        {/if}
                    </button>
                    <button on:click={() => timer.reset()}>
                        <Tooltip>タイマーをリセットします</Tooltip>
                        リセット
                        <i class="ti ti-reload" />
                    </button>
                </FlexRowWrapper>
            </section>
            <h3>時間形式</h3>
            <section>
                <Textbox bind:value={$config.format} />
                <small>
                    それぞれ
                    <p>
                        {'{minutes}'}
                        <i class="ti ti-chevron-right" />
                        分
                    </p>
                    <p>
                        {'{seconds}'}
                        <i class="ti ti-chevron-right" />
                        秒
                    </p>
                    <p>
                        {'{centiseconds}'}
                        <i class="ti ti-chevron-right" />
                        少数第2位までの秒
                    </p>
                    で置換されます。
                </small>
            </section>
        </FlexColWrapper>
        <FlexColWrapper widthFull>
            <h3>OBSに貼り付ける</h3>
            <section>
                {#if BROWSER}
                    <DragLink
                        href={() => {
                            const url = new URL($page.url);
                            url.pathname = `${url.pathname}asset`;
                            url.searchParams.set('assetId', Date.now().toString());
                            return url;
                        }}
                    >
                        <h3 slot="preview" class="drag-preview">
                            これをOBSにドロップ
                            <i class="ti ti-upload" />
                        </h3>
                        <div class="drag">
                            <i class="ti ti-drag-drop" />
                            ここをOBSにドラッグ&ドロップ
                        </div>
                    </DragLink>
                {/if}
            </section>
            <h3>見た目</h3>
            <section>
                <p class="setting">
                    <small>配置</small>
                    <Align bind:align={$config.style.align} />
                </p>
                <p class="setting">
                    <small>文字の色</small>
                    <input type="color" bind:value={$config.style.color} />
                </p>
                <p class="setting">
                    <small>文字の大きさ</small>
                    <span class="font-size">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            bind:value={$config.style.fontSize}
                        />
                        <input type="number" bind:value={$config.style.fontSize} />
                    </span>
                </p>
                <p class="setting">
                    <small>文字のフォント</small>
                    <input type="text" bind:value={$config.style.fontFamily} />
                </p>
                <p class="setting">
                    <small>背景の色</small>
                    <input type="color" bind:value={$config.style.backgroundColor} />
                </p>
                <p class="setting">
                    <small>背景の透明度</small>
                    <span class="font-size">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            bind:value={$config.style.backgroundOpacity}
                        />
                        <input type="number" bind:value={$config.style.backgroundOpacity} />
                    </span>
                </p>
                <div class="setting">
                    <FlexColWrapper>
                        <small>背景の余白</small>
                        <div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                bind:value={$config.style.backgroundPadding[0]}
                            />
                            <input type="number" bind:value={$config.style.backgroundPadding[0]} />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                bind:value={$config.style.backgroundPadding[1]}
                            />
                            <input type="number" bind:value={$config.style.backgroundPadding[1]} />
                        </div>
                    </FlexColWrapper>
                </div>
            </section>
        </FlexColWrapper>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        align-items: start;
        gap: 30px;
        justify-content: flex-start;
        width: 100%;
        height: 100vh;
        padding: 30px;
    }

    .drag-preview {
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        padding: 10px;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &:hover {
            margin-left: 4px;
            outline: 2px solid var(--color-1);
            box-shadow: -4px 4px 0 2px var(--color-2);
            transition: 0.0621s;
        }
    }

    .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        background: var(--color-bg-2);
        padding: 10px;

        & > input {
            height: 2rem;
            padding: 0;
            background: var(--color-bg-2);
            color: var(--color-1);
            font-weight: bold;

            &[type='color'] {
                border: 2px solid var(--color-1);
                padding: 0;
                width: 2rem;
                height: 2rem;
            }

            &[type='text'] {
                padding: 0 0.5rem;
                border: 2px solid var(--color-1);
                width: 8rem;
            }
        }

        & > .font-size {
            display: flex;
            align-items: center;
            gap: 5px;

            & > input[type='range'] {
                width: 6rem;
            }

            & > input[type='number'] {
                width: 3rem;
            }
        }
    }

    h3 {
        color: var(--color-1);
        margin-bottom: 10px;
    }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 0.75rem;
        font-weight: bold;
        color: var(--color-1);
        background: var(--color-bg-2);
        border: 2px solid var(--color-1);
        cursor: pointer;
        gap: 5px;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        & > i {
            font-size: 20px;
        }
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        margin-bottom: 20px;
    }
</style>
