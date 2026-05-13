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
    <main>
        <div class="header">
            <div class="inner">
                <h1>設定</h1>
                <label>
                    <button onclick={navigateToPrev}>
                        戻る <i class="ti ti-chevron-right"></i>
                    </button>
                </label>
            </div>
        </div>

        <div class="settings">
            <div class="panel data">
                <h2>音</h2>

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
                    <span>アプリ側</span>
                    <Checkbox bind:value={$config.audio.client} />
                </label>
                <label>
                    <span>OBS側</span>
                    <Checkbox bind:value={$config.audio.overlay} />
                </label>
            </div>

            <div class="panel data">
                <h2>データ</h2>

                <label>
                    <Tooltip>「ダウンロード」フォルダーに保存されます</Tooltip>
                    <span>書き出し</span>
                    <Button primary onclick={handleExport}>
                        保存 <i class="ti ti-download"></i>
                    </Button>
                </label>
                <label>
                    <span>読み込み</span>
                    <FileDrop primary handle={handleImport} accept=".omucafe">
                        <i class="ti ti-upload"></i> 開く
                    </FileDrop>
                </label>
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
                <label>
                    <span>データをすべて削除</span>
                    <Button primary onclick={handleResetAll}>
                        削除 <i class="ti ti-x"></i>
                    </Button>
                </label>
            </div>

            <div class="panel actions">
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
        </div>
    </main>

    {#if confirmScreen}
        <div class="screen">
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
        align-items: stretch;
        gap: 4rem;
    }

    .header {
        color: var(--color-1);
        padding-bottom: 1rem;
        background: var(--color-bg-1);
        border-bottom: 1px solid var(--color-outline);
        padding: 4rem;
        display: flex;
        align-items: center;
        justify-content: center;

        button {
            width: 10rem;
            height: 4rem;
            border: none;
            background: var(--color-1);
            color: var(--color-bg-2);
            font-weight: 600;
            cursor: pointer;
        }

        .inner {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            width: min(105rem, 100%);
        }
    }

    h1 {
        height: 8rem;
    }

    .settings {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 2rem;
        padding: 4rem;
    }

    .panel {
        position: relative;
        background: var(--color-bg-2);
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 30rem;
        height: fit-content;
        margin-top: 3rem;

        h2 {
            position: absolute;
            left: 0;
            top: -3rem;
            font-size: 1.25rem;
            background: var(--color-1);
            color: var(--color-bg-2);
            width: fit-content;
            padding: 0.25rem 0.5rem;
            width: 8rem;
        }
    }

    label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8rem;
        white-space: nowrap;
        font-size: 0.9rem;

        span {
            margin: 0;
        }
    }

    .screen {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--color-bg-1) 90%, transparent 0%);

        .dialog {
            background: var(--color-bg-2);
            border-radius: 6px;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            width: 30rem;

            .actions {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
            }
        }
    }
</style>
