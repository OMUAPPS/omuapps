<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, AssetButton, Button, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP, ASSET_APP } from './app.js';
    import { FriesApp } from './fries-app.js';
    import board from './img/board.png';
    import hint from './img/hint.png';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    setGlobal({ omu, obs });
    const friesApp = new FriesApp(omu);
    const { testSignal, config, state } = friesApp;

    testSignal.listen((v) => {
        console.log('testSignal', v);
    });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
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
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <section class="asset">
            <AssetButton asset={ASSET_APP} />
        </section>
        <h3>試しに投げてみる</h3>
        <section>
            <Button primary onclick={() => friesApp.test()}>
                投げる
                <i class="ti ti-arrow-up-right"></i>
            </Button>
        </section>
        <h3>看板</h3>
        <section>
            <textarea bind:value={$config.text} class="text"></textarea>
            <hr />
            <img src={board} alt="" />
        </section>
        <h3>ヒント</h3>
        <section>
            <textarea bind:value={$config.hint} class="hint"></textarea>
            <hr />
            <img src={hint} alt="" />
        </section>
        <section>
            <div>
                <h3>
                    状態
                    <Button primary onclick={() => { $state = { type: 'idle', start: Date.now() }; }}>
                        状態をリセット
                        <i class="ti ti-reload"></i>
                    </Button>
                </h3>
                <code>
                    {stateText}
                </code>
            </div>
        </section>
    </main>
</AppPage>

<style lang="scss">
    section {
        display: flex;
        flex-direction: row;
        align-items: start;
        justify-content: space-between;
        width: 50rem;
        max-width: 100%;
        margin-bottom: 1rem;

        hr {
            width: 100%;
            height: 1px;
            margin: 0 1rem;
            margin-top: 2rem;
            margin-left: 2.5rem;
            background: var(--color-1);
            border: none;
            transform: rotate(1deg);
        }

        img {
            width: 12rem;
            margin-top: 0;
            object-fit: contain;
            transform: rotate(-1.5deg);
        }
    }

    h3 {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--color-1);
    }

    textarea {
        margin-top: 0.5rem;
        width: 50rem;
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

    code {
        display: block;
        width: fit-content;
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        color: var(--color-1);
        font-size: 0.9rem;
        border-left: 2px solid var(--color-1);
    }
</style>
