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
    const exportPool = game.states.exportPool.store;
    const itemCount = $derived(Object.keys($exportPool.items).length);
    let confirmingClear = $state(false);

    $effect(() => {
        if (!$options.export) {
            $options.export = { name: '' };
        }
    });

    async function download() {
        if (!$options.export?.name.trim() || !itemCount) return;
        const pack = await ItemPack.create(game.states, Object.keys(game.states.exportPool.value.items), {
            type: 'item',
            name: $options.export.name,
        });
        const filename = `${$options.export.name}.cafeitem`;
        pack.download(filename);
    }
</script>

<main>
    <section class="panel" data-input>
        <header>
            <button class="back" onclick={goBack}><i class="ti ti-chevron-left"></i> 商品研究所へ</button>
            <h1>アイテムを共有</h1>
        </header>
        <div class="content">
            <p class="count">箱の中：{itemCount}個</p>
            {#if !itemCount}
                <p class="hint">共有したいアイテムを箱に入れてください。</p>
            {/if}
            {#if $options.export}
                <label>
                    パッケージ名
                    <Textbox bind:value={$options.export.name} placeholder="例：カフェの食器セット" />
                </label>
            {/if}
            <Button primary onclick={download} disabled={!$options.export?.name.trim() || !itemCount}>
                <Tooltip>
                    {#if !itemCount}
                        箱にアイテムを入れてください
                    {:else if !$options.export?.name.trim()}
                        名前を入力してください
                    {:else}
                        共有用のファイルを書き出します
                    {/if}
                </Tooltip>
                <i class="ti ti-download"></i> ダウンロード
            </Button>
            <a class="guidelines" href="https://omuapps.com/legal/export" target="_blank" rel="noopener">
                共有前の注意事項 <i class="ti ti-external-link"></i>
            </a>
            <details>
                <summary>箱を整理</summary>
                <div class="actions">
                    {#if confirmingClear && itemCount}
                        <p>箱のアイテム{itemCount}個をすべて取り除きますか？</p>
                        <Button onclick={() => (confirmingClear = false)}>キャンセル</Button>
                        <Button onclick={() => {
                            game.addTask(async () => {
                                game.states.exportPool.value.items = {};
                            });
                            confirmingClear = false;
                        }}>
                            箱を空にする
                        </Button>
                    {:else}
                        <Button disabled={!itemCount} onclick={() => (confirmingClear = true)}>
                            <i class="ti ti-trash"></i> 箱を空にする
                        </Button>
                    {/if}
                </div>
            </details>
        </div>
    </section>
</main>

<style lang="scss">
    main { position: absolute; inset: 0; pointer-events: none; }
    .panel {
        position: absolute;
        top: 1rem;
        left: 1rem;
        box-sizing: border-box;
        width: min(24rem, calc(100% - 2rem));
        max-height: calc(100% - 2rem);
        display: flex;
        flex-direction: column;
        background: var(--color-bg-1);
        color: var(--color-text);
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        pointer-events: auto;
        overflow: hidden;
    }
    header { padding: 1rem; border-bottom: 1px solid var(--color-outline); flex-shrink: 0; }
    h1 { margin: 0.75rem 0 0; font-size: 1.25rem; color: var(--color-1); }
    .back { padding: 0; border: none; background: transparent; color: var(--color-text); font: inherit; font-size: 0.85rem; cursor: pointer; }
    .back:focus-visible { outline: 2px solid var(--color-1); outline-offset: 3px; }
    .content { padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; min-height: 0; }
    p { margin: 0; font-size: 0.875rem; line-height: 1.6; }
    .count { font-weight: 600; }
    .hint { padding: 0.75rem; border-radius: 0.4rem; background: var(--color-bg-2); }
    label { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; }
    .guidelines { align-self: flex-start; font-size: 0.8rem; color: var(--color-1); }
    details { border-top: 1px solid var(--color-outline); padding-top: 0.75rem; }
    summary { cursor: pointer; font-size: 0.85rem; }
    .actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
</style>
