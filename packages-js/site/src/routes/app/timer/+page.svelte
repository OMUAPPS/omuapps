<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import {
        Align,
        AppHeader,
        setClient,
        Textbox,
        Tooltip,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import Timer from './components/Timer.svelte';
    import { TimerApp } from './timer-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const timer = new TimerApp(omu);
    const { data, config } = timer;
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <div class="flex col width">
            <h3>タイム</h3>
            <section class="timer">
                <Timer {timer} />
            </section>

            <h3>操作</h3>
            <section>
                <div class="flex gap">
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
                            <i class="ti ti-player-pause"></i>
                        {:else}
                            開始
                            <i class="ti ti-player-play"></i>
                        {/if}
                    </button>
                    <button on:click={() => timer.reset()}>
                        <Tooltip>タイマーをリセットします</Tooltip>
                        リセット
                        <i class="ti ti-reload"></i>
                    </button>
                </div>
            </section>
            <h3>時間形式</h3>
            <section>
                <Textbox bind:value={$config.format} />
                <small>
                    それぞれ
                    <p>
                        {'{minutes}'}
                        <i class="ti ti-chevron-right"></i>
                        分
                    </p>
                    <p>
                        {'{seconds}'}
                        <i class="ti ti-chevron-right"></i>
                        秒
                    </p>
                    <p>
                        {'{centiseconds}'}
                        <i class="ti ti-chevron-right"></i>
                        少数第2位までの秒
                    </p>
                    で置換されます。
                </small>
            </section>
        </div>
        <div class="flex col width">
            <h3>OBSに貼り付ける</h3>
            <section>
                <AssetButton {omu} {obs} />
            </section>
            <h3>見た目</h3>
            <section>
                <p class="setting">
                    <small>配置</small>
                    <Align bind:horizontal={$config.style.align.x} bind:vertical={$config.style.align.y} />
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
                    <div>
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
                    </div>
                </div>
            </section>
        </div>
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
        height: 100%;
        padding: 30px;
    }

    .timer {
        transform-origin: top left;
        transform: scale(0.5);
        width: 0;
        height: 5rem;
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

    .flex {
        display: flex;
    }

    .col {
        flex-direction: column;
    }

    .width {
        width: 100%;
    }

    .gap {
        gap: 1rem;
    }
</style>
