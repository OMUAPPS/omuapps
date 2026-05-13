<script lang="ts">
    import { Button, Textbox, Tooltip } from '@omujs/ui';
    import type { Game } from '../../core/game';
    import { ItemPack } from '../../core/game-state';
    import type { SceneExportData } from './export';

    interface Props {
        scene: SceneExportData;
        game: Game;
    }

    let { game, scene = $bindable() }: Props = $props();

    function goBack() {
        game.startTransition({
            type: 'factory',
        });
    }

    const options = game.states.config.store;

    $effect(() => {
        if (!$options.export) {
            $options.export = { name: '' };
        }
    });

    async function download() {
        if (!$options.export) return;
        const pack = await ItemPack.create(game.states, Object.keys(game.states.exportPool.value.items), {
            type: 'item',
            name: $options.export.name,
        });
        const filename = `${$options.export.name}.cafeitem`;
        pack.download(filename);
    }
</script>

<main>
    <div class="menu">
        <div class="panel">
            <Button onclick={goBack} primary>
                <i class="ti ti-chevron-left"></i>
                もどる
            </Button>
            <h1>
                商品輸出
            </h1>
            <p>この箱に入れたアイテムを共有することができます</p>
            <br>
            <p>
                <span>共有する前に</span>
                <a href="https://omuapps.com/legal/export" target="_blank" rel="noopener">
                    こちら
                    <i class="ti ti-external-link"></i>
                </a>
                <span>をお読みください</span>
            </p>
        </div>
        <div class="panel">
            <h1>書き出し</h1>

            {#if $options.export}
                <Textbox bind:value={$options.export.name} placeholder="パッケージ名" />
            {/if}
            <br>
            <small>

                <p>ダウンロード後はダウンロードフォルダに出力されます</p>
            </small>
            <div class="actions">
                <Button primary onclick={download} disabled={!$options.export?.name}>
                    <Tooltip>
                        {#if $options.export?.name}
                            ダウンロードフォルダに書き出されます
                        {:else}
                            名前を入力してください
                        {/if}
                    </Tooltip>
                    ダウンロード
                    <i class="ti ti-download"></i>
                </Button>
                <Button primary onclick={() => {
                    game.addTask(async () => {
                        game.states.exportPool.value.items = {};
                    });
                }}>
                    <Tooltip>
                        箱のアイテムを消します
                    </Tooltip>
                    新しい箱を用意する
                    <i class="ti ti-plus"></i>
                </Button>
            </div>
        </div>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
    }

    .menu {
        width: 28rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 2rem;
        background: linear-gradient(
            to right,
            color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%),
            transparent
        );
    }

    .panel {
        position: relative;
        display: flex;
        align-items: stretch;
        flex-direction: column;
        padding: 1.5rem 1.5rem;
        background: var(--color-bg-1);
        box-shadow: 0 0 1rem rgba($color: #888, $alpha: 0.3);
        border-radius: 0.25rem;

        > .close {
            align-self: flex-start;
            padding: 0.75rem 1.5rem;
            margin: 2px;
            font-weight: 600;
            font-size: 0.9rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border-radius: 2px;
            border: none;
            cursor: pointer;
            margin-bottom: 2rem;
        }
    }

    h1 {
        margin: 0.5rem 0;
        margin-top: 1rem;
        text-align: left;
        font-size: 1.5rem;
        color: var(--color-1);
        corner-shape: squircle;
        padding: 0.5rem 0;
        border-bottom: 2px solid var(--color-1);
        width: 100%;
        margin-bottom: 1rem;
    }

    .actions {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
