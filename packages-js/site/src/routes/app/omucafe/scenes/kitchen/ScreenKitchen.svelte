<script lang="ts">
    import { Button } from '@omujs/ui';
    import { fly } from 'svelte/transition';
    import type { Game } from '../../core/game';
    import type { SceneKitchenData } from './kitchen';
    import omucafe from './omucafe-howto.png';

    interface Props {
        scene: SceneKitchenData;
        game: Game;
    }

    let { scene = $bindable(), game }: Props = $props();
</script>

{#if game.side === 'client' && scene.tutorial}
    <main data-input>
        <div
            class="screen"
            in:fly|global={{ y: 50, duration: 1000, opacity: 0 }}
            out:fly|global={{ y: -50, duration: 230, opacity: 0 }}
        >
            <h1>ここはあなたのお店です</h1>
            <small>初めての方は遊び方を確認することをおすすめします</small>
            <a class="thumbnail" href="https://omuapps.com/docs/app/omucafe/" target="_blank">
                <img src={omucafe} alt="">
                <div class="pointer">
                    <i class="ti ti-pointer-filled"></i>
                </div>
            </a>
            <div class="actions">
                <Button primary onclick={() => {
                    scene.tutorial = undefined;
                    scene = { ...scene };
                }}>
                    閉じる
                </Button>
            </div>
        </div>
    </main>
{/if}

<style>
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .screen {
        position: absolute;
        inset: 0;
        background: radial-gradient(
            color-mix(in srgb, var(--color-bg-1) 98%, transparent 0%) 25%,
            color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%) 100%
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
    }

    h1 {
        color: var(--color-1);
    }

    .thumbnail {
        position: relative;
    }

    img {
        width: 40rem;
        height: calc(40rem * 9 / 16);
        outline: 2px solid var(--color-bg-2);
        outline-offset: 8px;
        margin: 1rem;
        border-radius: 1px;

        &:hover {
            opacity: 0.8;
            transition: opacity 0.0621s;
        }
    }

    .pointer {
        position: absolute;
        right: 2rem;
        bottom: 1.75rem;
        width: 20px;
        height: 20px;
        -webkit-text-stroke: 2.5px #fff;
        color: var(--color-1);
        font-size: 2.6rem;
        text-shadow: rgba(0, 0, 0, 0.5) 2px 2px 5px;
        pointer-events: none;

        > img {
            width: fit-content;
        }
    }
</style>
