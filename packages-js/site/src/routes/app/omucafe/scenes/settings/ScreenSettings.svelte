<script lang="ts">
    import { dev } from '$app/environment';
    import { Button, Checkbox, ExternalLink, FileDrop, Slider, Textbox, Tooltip } from '@omujs/ui';
    import type { Game } from '../../core/game';
    import { CafePack } from '../../core/game-state';
    import { testScripting } from '../../script/script';
    import type { SceneSettingsData } from './settings';

    interface Props {
        game: Game;
        scene: SceneSettingsData;
    }

    let { game, scene = $bindable() }: Props = $props();

    const shop = game.states.shop.store;
    const config = game.states.config.store;

    let confirmScreen: { type: 'reset'; confirm: () => void } | undefined = $state();

    // ==========================================
    // イベントハンドラー
    // ==========================================

    async function handleExport() {
        const pack = await CafePack.create(game.states);
        pack.download(`${game.states.shop.value.shop.name}.omucafe`);
    }

    async function handleImport(files: FileList) {
        const buffer = new Uint8Array(await files[0].arrayBuffer());
        const pack = CafePack.load(buffer);
        await pack.apply(game);
    }

    function handleResetAll() {
        confirmScreen = {
            type: 'reset',
            confirm: () => {
                game.addTask(async () => {
                    await game.states.resetAll();
                    game.states.scene.value = {
                        type: 'main_menu',
                        task: { type: 'obs_waiting' },
                    };
                });
            },
        };
    }

    function navigateToPrev() {
        game.startTransition(scene.prev);
    }

    function navigateToObsSetup() {
        game.startTransition({
            type: 'main_menu',
            task: { type: 'obs_waiting' },
        });
    }
</script>

{#snippet client()}
    <main data-input>
        <div class="header">
            <div class="inner">
                <h1>設定</h1>
                <label>
                    <button onclick={navigateToPrev}>
                        <i class="ti ti-chevron-left"></i> 戻る
                    </button>
                </label>
            </div>
        </div>

        <div class="settings">
            <div class="panel data">
                <h2>音量・再生先</h2>

                <label>
                    <span>主音量</span>
                    <Slider bind:value={$config.audio.masterVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
                <label>
                    <span>音楽</span>
                    <Slider bind:value={$config.audio.musicVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
                <label>
                    <span>効果音</span>
                    <Slider bind:value={$config.audio.sfxVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
                <label>
                    <span>アプリで音を再生</span>
                    <Checkbox bind:value={$config.audio.client} />
                </label>
                <label>
                    <span>OBSで音を再生</span>
                    <Checkbox bind:value={$config.audio.overlay} />
                </label>
            </div>

            <div class="panel shop">
                <h2>お店の情報</h2>
                <label>
                    <span>屋号</span>
                    <Textbox bind:value={$shop.shop.name} />
                </label>
                <label>
                    <span>住所</span>
                    <Textbox bind:value={$shop.shop.address} />
                </label>
                <label>
                    <span>店主名</span>
                    <Textbox bind:value={$shop.shop.owner} />
                </label>
            </div>

            <div class="panel data">
                <h2>バックアップ</h2>
                <p class="description">お店のデータをファイルに書き出し、読み込めます。</p>

                <label>
                    <Tooltip>「ダウンロード」フォルダーに保存されます</Tooltip>
                    <span>書き出し</span>
                    <Button primary onclick={handleExport}>
                        書き出す <i class="ti ti-download"></i>
                    </Button>
                </label>
                <label>
                    <span>データを置き換え</span>
                    <FileDrop primary handle={handleImport} accept=".omucafe">
                        <i class="ti ti-upload"></i> 読み込む
                    </FileDrop>
                </label>

            </div>

            <div class="panel">
                <h2>OBS・ヘルプ</h2>
                <label>
                    <span>OBSの設定をやり直す</span>
                    <Button primary onclick={navigateToObsSetup}>
                        設定 <i class="ti ti-chevron-right"></i>
                    </Button>
                </label>
                <label>
                    <ExternalLink href="https://omuapps.com/docs/app/omucafe/" title="OMUAPPS">
                        遊び方はこちら <i class="ti ti-external-link"></i>
                    </ExternalLink>
                </label>

                {#if dev}
                    <label>
                        <span>[dev] デバッグスクリプト実行</span>
                        <Button primary onclick={testScripting}>
                            実行 <i class="ti ti-chevron-right"></i>
                        </Button>
                    </label>
                {/if}
            </div>
            <div class="panel danger">
                <div>
                    <h2>データの全削除</h2>
                    <p class="description">お店のデータをすべて削除します。必要なデータは先に書き出してください。</p>
                </div>
                <button class="danger-button" onclick={handleResetAll}>すべて削除…</button>
            </div>
        </div>
    </main>

    {#if confirmScreen}
        <div class="screen" data-input>
            <div class="dialog">
                <h1>本当にデータをすべて削除しますか？</h1>
                <div class="actions">
                    <Button onclick={() => (confirmScreen = undefined)}>
                        キャンセル
                    </Button>
                    <Button primary onclick={() => {
                        confirmScreen?.confirm();
                        confirmScreen = undefined;
                    }}>
                        削除
                    </Button>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

{#if game.side === 'client'}
    {@render client()}
{/if}

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-1);
        color: var(--color-text);
        overflow: hidden;
    }

    .header {
        flex: none;
        padding: 1.25rem 2rem;
        border-bottom: 1px solid var(--color-outline);

        .inner {
            max-width: 64rem;
            margin: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        button {
            padding: 0.65rem 1rem;
            border: 1px solid var(--color-outline);
            border-radius: 0.5rem;
            background: var(--color-bg-2);
            color: var(--color-text);
            cursor: pointer;
        }
    }

    h1 { margin: 0; font-size: 1.6rem; color: var(--color-1); }
    h2 { margin: 0; font-size: 1.1rem; color: var(--color-1); }
    .description { margin: 0; font-size: 0.875rem; line-height: 1.6; }

    .settings {
        box-sizing: border-box;
        width: 100%;
        max-width: 68rem;
        margin: 0 auto;
        padding: 1.5rem 2rem 3rem;
        overflow-y: auto;
        min-height: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.25rem;
        align-content: start;
        align-items: start;
    }

    .panel {
        min-width: 0;
        padding: 1.5rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.75rem;
        background: var(--color-bg-2);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.9rem;
        min-width: 0;

        span { flex-shrink: 0; }
    }

    .shop label {
        display: grid;
        grid-template-columns: 5rem minmax(0, 1fr);
    }

    .danger {
        grid-column: 1 / -1;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        border-color: #b74747;

        h2 { color: #a33131; margin-bottom: 0.5rem; }
    }

    .danger-button {
        flex-shrink: 0;
        padding: 0.75rem 1rem;
        background: transparent;
        color: #a33131;
        border: 1px solid currentColor;
        border-radius: 0.5rem;
        cursor: pointer;
    }

    button:focus-visible { outline: 2px solid var(--color-1); outline-offset: 3px; }

    .screen {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgb(0 0 0 / 40%);

        .dialog {
            box-sizing: border-box;
            width: min(30rem, 100%);
            max-height: 100%;
            overflow: auto;
            background: var(--color-bg-2);
            border-radius: 0.75rem;
            padding: 2rem;

            h1 { font-size: 1.25rem; line-height: 1.6; }
            .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
        }
    }

    @media (max-width: 760px) {
        .header { padding: 1rem; }
        .settings { grid-template-columns: minmax(0, 1fr); padding: 1rem; }
        .panel { padding: 1rem; }
        .danger { flex-direction: column; align-items: stretch; }
    }
</style>
