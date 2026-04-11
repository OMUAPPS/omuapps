<script lang="ts">
    import { Button, FileDrop, Textbox, Tooltip } from '@omujs/ui';
    import type { Game } from '../../core/game';
    import { KitchenPack } from '../../core/game-state';
    import type { SceneSettingsData } from './settings';

    interface Props {
        game: Game;
        scene: SceneSettingsData;
    }

    let { game, scene }: Props = $props();

    const shop = game.states.shop.store;
</script>

{#snippet client()}
    <div class="panel data">
        <h1>データ</h1>

        <label>
            <Tooltip>
                「ダウンロード」フォルダーに保存されます
            </Tooltip>
            <p>書き出し</p>
            <Button primary onclick={async () => {
                const pack = await KitchenPack.create(game.states);
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
                const pack = KitchenPack.load(buffer);
                pack.apply(game.states);
            }}>
                開く
                <i class="ti ti-upload"></i>
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
    </div>
    <div class="panel actions">
        <h1>メニュー</h1>
        <label>
            <Button onclick={() => {
                game.startTransition(scene.prev);
            }} primary>
                戻る
            </Button>
        </label>
    </div>
{/snippet}

<main>
    {#if game.side === 'client'}
        {@render client()}
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 4rem;
        padding: 4rem;
        justify-content: space-evenly;
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
</style>
