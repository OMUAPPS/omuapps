<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import type { AudioClip } from '../audio';
    import { Game } from '../core/game';

    interface Props {
        clip: AudioClip | undefined;
    }

    let {
        clip = $bindable(),
    }: Props = $props();

    const game = Game.getInstance();
    let audio = $derived(clip ? game.asset.getUrl(clip.asset) : undefined);
</script>

<div class="edit">
    {#if clip}
        <span>
            <Button onclick={() => {
                clip = undefined;
            }} primary>
                削除
            </Button>
        </span>
        {#await audio?.promise then audio}
            {#if audio?.type === 'ready'}
                <audio controls src={audio.data}></audio>
            {/if}
        {/await}
    {:else}
        <FileDrop accept="audio/*" handle={async (files) => {
            const file = files[0];
            clip = {
                asset: await game.asset.uploadFile(file),
                start: 0,
                duration: 10,
            };
        }} primary>
            変更する
        </FileDrop>
    {/if}
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
