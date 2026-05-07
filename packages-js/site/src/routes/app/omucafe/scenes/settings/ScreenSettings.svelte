<script lang="ts">
    import { dev } from '$app/environment';
    import { Button, ExternalLink, FileDrop, Slider, Textbox, Tooltip } from '@omujs/ui';
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

    let confirmScreen: {
        type: 'reset';
        confirm: () => void;
    } | undefined = $state();
</script>

{#snippet client()}
    <main>
        <div class="header">
            <h1>設定</h1>
        </div>
        <div class="settings">
            <div class="panel data">
                <h1>音</h1>

                <label>
                    主音量
                    <Slider bind:value={$config.audio.masterVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
                <label>
                    音楽
                    <Slider bind:value={$config.audio.musicVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
                <label>
                    効果音
                    <Slider bind:value={$config.audio.sfxVolume} min={0} max={1} step={0.01} type="percent" />
                </label>
            </div>
            <div class="panel data">
                <h1>データ</h1>

                <label>
                    <Tooltip>
                        「ダウンロード」フォルダーに保存されます
                    </Tooltip>
                    <p>書き出し</p>
                    <Button primary onclick={async () => {
                        const pack = await CafePack.create(game.states);
                        const filename = `${game.states.shop.value.shop.name}.omucafe`;
                        pack.download(filename);
                    }}>
                        保存
                        <i class="ti ti-download"></i>
                    </Button>
                </label>
                <label>
                    <p>読み込み</p>
                    <FileDrop primary handle={async (files) => {
                        const arrayBuffer = await files[0].arrayBuffer();
                        const buffer = new Uint8Array(arrayBuffer);
                        const pack = CafePack.load(buffer);
                        await pack.apply(game);
                    }} accept=".omucafe">
                        <i class="ti ti-upload"></i>
                        開く
                    </FileDrop>
                </label>
                <label>
                    <p>屋号</p>
                    <Textbox bind:value={$shop.shop.name} />
                </label>
                <label>
                    <p>住所</p>
                    <Textbox bind:value={$shop.shop.address} />
                </label>
                <label>
                    <p>店主名</p>
                    <Textbox bind:value={$shop.shop.owner} />
                </label>
                <label>
                    <p>データをすべて削除</p>
                    <Button primary onclick={() => {
                        confirmScreen = {
                            type: 'reset',
                            confirm: () => {
                                game.addTask(async () => {
                                    await game.states.resetAll();
                                    game.states.scene.value = {
                                        type: 'main_menu',
                                        task: {
                                            type: 'obs_waiting',
                                        },
                                    };
                                });
                            },
                        };
                    }}>
                        削除
                        <i class="ti ti-x"></i>
                    </Button>
                </label>
            </div>
            <div class="panel actions">
                <label>
                    <p>キッチンに戻る</p>
                    <Button onclick={() => {
                        game.startTransition(scene.prev);
                    }} primary>
                        戻る
                        <i class="ti ti-chevron-right"></i>
                    </Button>
                </label>
                <label>
                    <p>OBSの設定をやり直す</p>
                    <Button onclick={() => {
                        game.startTransition({
                            type: 'main_menu',
                            task: { type: 'obs_waiting' },
                        });
                    }} primary>
                        設定
                        <i class="ti ti-chevron-right"></i>
                    </Button>
                </label>
                <label>
                    <ExternalLink href="https://omuapps.com/docs/app/omucafe/" title="OMUAPPS">
                        遊び方はこちら
                        <i class="ti ti-external-link"></i>
                    </ExternalLink>
                </label>
                {#if dev}
                    <label>
                        <p>run</p>
                        <Button onclick={() => {
                            testScripting();
                        }} primary>
                            設定
                            <i class="ti ti-chevron-right"></i>
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
                    <Button onclick={() => {
                        confirmScreen = undefined;
                    }}>
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
        padding: 4rem;
    }

    .settings {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 4rem;
    }

    h1 {
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        padding-bottom: 1rem;
    }

    .panel {
        border-radius: 6px;
        background: var(--color-bg-2);
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 30rem;
        height: fit-content;
    }

    label {
        display: flex;
        justify-content: space-between;
        gap: 8rem;
        white-space: nowrap;
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
