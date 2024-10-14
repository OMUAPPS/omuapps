<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { FriesApp } from './fries-app.js';
    import board from './img/board.png';
    import hint from './img/hint.png';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    setClient(omu);
    const friesApp = new FriesApp(omu);
    const { testSignal, config, state } = friesApp;

    testSignal.listen((v) => {
        console.log('testSignal', v);
    });

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

    $: stateText = {
        idle: '待機中',
        idle_start: '待機開始',
        throwing: '投げ中',
        thrown: '投げ終わり',
        catching: 'キャッチ中',
        eating: '食べ中',
        throw_many: 'たくさん投げる',
        throw_many_hit: 'たくさん投げる当たり',
        throw_start: '投げ開始',
    }[$state.type];
</script>

<AppPage>
    <main>
        <p>このアプリは一つのみ配置することができます。</p>
        <section class="asset">
            <AssetButton {omu} {obs} />
        </section>
        <section>
            <div>
                <h3>試しに投げてみる</h3>
                <button on:click={() => friesApp.test()}>
                    投げる
                    <i class="ti ti-arrow-up-right" />
                </button>
            </div>
        </section>
        <section>
            <div>
                <h3>ヒント</h3>
                <textarea bind:value={$config.hint} class="hint" />
            </div>
            <hr />
            <img src={hint} alt="" />
        </section>
        <section>
            <div>
                <h3>看板</h3>
                <textarea bind:value={$config.text} class="text" />
            </div>
            <hr />
            <img src={board} alt="" />
        </section>
        <section>
            <div>
                <h3>
                    状態
                    <button on:click={() => ($state = { type: 'idle' })}>
                        状態をリセット
                        <i class="ti ti-reload" />
                    </button>
                </h3>
                <code>
                    {stateText}
                </code>
                <span class="state">
                    {JSON.stringify($state)}
                </span>
            </div>
        </section>
    </main>
</AppPage>

<style lang="scss">
    main {
        padding: 2rem;
    }

    .asset {
        margin-bottom: 2rem;
    }

    section {
        display: flex;
        flex-direction: row;
        align-items: start;
        justify-content: space-between;
        width: 50rem;
        max-width: 100%;

        hr {
            width: 100%;
            height: 1px;
            margin: 0 1rem;
            margin-top: 4rem;
            margin-left: 2.5rem;
            background: var(--color-1);
            border: none;
            transform: rotate(-1deg);
        }

        img {
            width: 12rem;
            margin-top: 2rem;
            object-fit: contain;
            transform: rotate(-1.5deg);
        }
    }

    h3 {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-top: 1rem;
        color: var(--color-1);
    }

    textarea {
        margin-top: 0.5rem;
        width: 20rem;
        height: 5rem;
        background: var(--color-bg-2);
        border: 1px solid var(--color-outline);
        padding: 0.5rem;

        &:focus,
        &:hover {
            border-color: var(--color-1);
        }

        &:focus {
            outline: none;
        }
    }

    button {
        margin-top: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--color-1);
        color: var(--color-bg-1);
        font-size: 0.9rem;
        font-weight: 500;
        border: none;
        border-radius: 2.5px;
        cursor: pointer;

        &:hover {
            background: var(--color-1);
        }
    }

    code {
        display: block;
        width: fit-content;
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        color: var(--color-1);
        font-size: 0.9rem;
        border-left: 2px solid var(--color-1);
    }

    .state {
        font-weight: 600;
        font-size: 0.8rem;
        color: #444;
    }
</style>
