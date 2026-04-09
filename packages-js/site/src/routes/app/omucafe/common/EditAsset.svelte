<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import type { Asset } from '../core/asset';
    import { Game } from '../core/game';

    interface Props {
        asset: Asset;
        remove?: () => void;
    }

    let { asset = $bindable(), remove }: Props = $props();

    const game = Game.getInstance();

    let urlPromise = $derived(game.asset.getUrl(asset));
</script>

<div class="edit">
    <span>
        {#if remove}
            <Button onclick={remove} primary>
                削除
            </Button>
        {/if}
    </span>
    <div class="image">
        {#await urlPromise.promise then result}
            {#if result.type === 'ready'}
                <img src={result.data} alt="">
            {/if}
        {/await}
        <FileDrop accept="image/*" handle={async (files) => {
            const file = files[0];
            asset = await game.asset.uploadFile(file);
        }}>
            {#snippet button({ open })}
                <button onclick={open}>
                    変更する
                </button>
            {/snippet}
        </FileDrop>
    </div>
</div>

<style lang="scss">
    .edit {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .image {
        position: relative;
        background-image:
        conic-gradient(
            rgba(238, 238, 238, 1) 0deg 90deg,
            rgba(255, 255, 255, 1) 90deg 180deg,
            rgba(238, 238, 238, 1) 180deg 270deg,
            rgba(255, 255, 255, 1) 270deg 360deg
        );
        background-size: 32px 32px;
        background-position: 0 0;
        outline: 1px solid var(--color-outline);
        height: 8rem;
        width: 8rem;

        > img {
            height: 8rem;
            width: 8rem;
            object-fit: contain;
        }
    }

    button {
        position: absolute;
        inset: 0;
        visibility: hidden;
        background: rgba($color: #fff, $alpha: 0.5);
        border: none;
        font-weight: 600;
        font-size: 1rem;
        color: var(--color-1);
    }

    .image:hover > button {
        visibility: visible;
        cursor: pointer;
    }
</style>
