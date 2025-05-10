<script lang="ts">
    import { Slider, Tooltip } from '@omujs/ui';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    const { scene, gameConfig } = getGame();
    $: console.log('ScenePhotoMode', context);
</script>

<svelte:window on:wheel={(event) => {
    let scale = $gameConfig.photo_mode.scale;
    scale += event.deltaY * -0.01;
    $gameConfig.photo_mode.scale = Math.min(Math.max(-10, scale), 10);
}} />

<div class="screen">
    <div class="color">
        <div class="tools">
            <button class="tool" class:active={$gameConfig.photo_mode.tool.type === 'move'} on:click={() => {
                $gameConfig.photo_mode.tool = {
                    type: 'move',
                }
            }}>
                <Tooltip>
                    <span>とっておきの映える配置に！</span>
                </Tooltip>
                <i class="ti ti-arrows-move"></i>
                <span>アイテム移動</span>
            </button>
            <button class="tool" class:active={$gameConfig.photo_mode.tool.type === 'pen'} on:click={() => {
                $gameConfig.photo_mode.tool = {
                    type: 'pen',
                }
            }}>
                <Tooltip>
                    <span>ちょっと勇気を出して絵でも描いてみよう</span>
                </Tooltip>
                <i class="ti ti-pencil"></i>
                <span>ペン</span>
            </button>
            <button class="tool" class:active={$gameConfig.photo_mode.tool.type === 'eraser'} on:click={() => {
                $gameConfig.photo_mode.tool = {
                    type: 'eraser',
                }
            }}>
                <Tooltip>
                    <span>まだやり直せる…！</span>
                </Tooltip>
                <i class="ti ti-eraser"></i>
                <span>消しゴム</span>
            </button>
        </div>
        <div class="config">
            {#if $gameConfig.photo_mode.tool.type === 'pen'}
                <p>ペンの太さ</p>
                <Slider
                    min={0}
                    max={400}
                    step={1}
                    bind:value={$gameConfig.photo_mode.pen.width}
                />
            {:else if $gameConfig.photo_mode.tool.type === 'eraser'}
                <p>消しゴムの太さ</p>
                <Slider
                    min={0}
                    max={400}
                    step={1}
                    bind:value={$gameConfig.photo_mode.eraser.width}
                />
            {:else if $gameConfig.photo_mode.tool.type === 'move'}
                <p>アイテムの大きさ</p>
                <Slider
                    min={-10}
                    max={10}
                    step={0.1}
                    bind:value={$gameConfig.photo_mode.scale}
                />
            {/if}
        </div>
    </div>
    <div class="exit">
        <button on:click={() => {
            $scene = {
                type: 'cooking',
            };
        }}>
            終わる
            <i class="ti ti-x"></i>
        </button>
    </div>
</div>

<style lang="scss">
    .screen {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        font-size: 1.6rem;
        gap: 4rem;
        animation: fadeIn 0.1621s ease-in;
        padding: 4rem;
        background: linear-gradient(to top, var(--color-bg-2), color-mix(in srgb, var(--color-bg-2) 50%, transparent 0%));
        outline: 1px solid var(--color-bg-2);
    }

    .col {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .config {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        font-size: 1.6rem;
        font-weight: 600;
        margin-top: 1rem;

        > p {
            font-size: 1rem;
            font-weight: 600;
            width: 10rem;
            color: var(--color-1);
        }
    }

    .tools {
        display: flex;
        gap: 0.5rem;
        font-size: 1.6rem;
        font-weight: 600;

        @media (max-width: 480px) {
            font-size: 1.2rem;
        }
    }

    .active {
        background: var(--color-1);
        color: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
    }
    
    button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--color-bg-1);
        color: var(--color-1);
        outline: 1px solid var(--color-bg-2);
        outline-offset: -1px;
        border-radius: 2px;
        border: none;
        padding: 0.5rem 1.5rem;
        font-weight: 600;
        font-size: 1.2rem;
        white-space: nowrap;
        cursor: pointer;
        touch-action: manipulation;

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }

    @keyframes fadeIn {
        0% {
            opacity: 0.8;
            transform: translateY(5rem) scaleY(0);
        }
        78% {
            opacity: 1;
            transform: translateY(-0.5rem) scaleY(1.1);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
        }
    }
</style>
