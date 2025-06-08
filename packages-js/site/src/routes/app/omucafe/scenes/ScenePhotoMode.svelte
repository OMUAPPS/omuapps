<script lang="ts">
    import { Slider, Tooltip } from '@omujs/ui';
    import { fly } from 'svelte/transition';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    const { scene, obs, gameConfig } = getGame();
    $: console.log('ScenePhotoMode', context);

    const COLORS = [
        {x: 0x30, y: 0x30, z: 0x30},
        {x: 0xEB, y: 0x6F, z: 0x9A},
        {x: 0xF1, y: 0x73, z: 0x61},
        {x: 0xE4, y: 0x83, z: 0x16},
        {x: 0xC5, y: 0x98, z: 0x00},
        {x: 0x92, y: 0xAC, z: 0x1C},
        {x: 0x44, y: 0xB9, z: 0x67},
        {x: 0xff, y: 0xff, z: 0xff},
        {x: 0x00, y: 0xBB, z: 0xA2},
        {x: 0x00, y: 0xB5, z: 0xCE},
        {x: 0x0B, y: 0xA9, z: 0xF6},
        {x: 0x79, y: 0x97, z: 0xFF},
        {x: 0xAE, y: 0x85, z: 0xF1},
        {x: 0xD4, y: 0x76, z: 0xCD},
    ];

    let screenshot: {
        type: 'taking',
    } | {
        type: 'taken',
        url: string,
    } | null = null;
</script>

<svelte:window
    on:wheel={(event) => {
        let scale = $gameConfig.photo_mode.scale;
        const logFactor = 2.621;
        const wheelFactor = 0.002621;
        if ($gameConfig.photo_mode.tool.type === 'move') {
            scale += event.deltaY * -0.01;
            $gameConfig.photo_mode.scale = Math.min(Math.max(-10, scale), 10);
        } else if ($gameConfig.photo_mode.tool.type === 'pen') {
            const level = Math.pow($gameConfig.photo_mode.pen.width, 1 / logFactor);
            const newLevel = level + event.deltaY * wheelFactor;
            const newWidth = Math.pow(newLevel, logFactor);
            $gameConfig.photo_mode.pen.width = Math.min(Math.max(1, newWidth), 400);
        } else if ($gameConfig.photo_mode.tool.type === 'eraser') {
            const level = Math.pow($gameConfig.photo_mode.eraser.width, 1 / logFactor);
            const newLevel = level + event.deltaY * wheelFactor;
            const newWidth = Math.pow(newLevel, logFactor);
            $gameConfig.photo_mode.eraser.width = Math.min(Math.max(1, newWidth), 400);
        }
    }}
    on:keydown={(event) => {
        if (!context.active) return;
        if (event.key === 'e') {
            $gameConfig.photo_mode.tool = {
                type: 'eraser',
            };
        } else if (['p', 'b'].includes(event.key)) {
            $gameConfig.photo_mode.tool = {
                type: 'pen',
            };
        } else if (event.key === 'm') {
            $gameConfig.photo_mode.tool = {
                type: 'move',
            };
        }
    }}
/>

<div class="background"></div>
<div class="screen">
    <div class="tools">
        <button class="tool" class:active={$gameConfig.photo_mode.tool.type === 'move'} on:click={() => {
            $gameConfig.photo_mode.tool = {
                type: 'move',
            }
        }}>
            <Tooltip>
                <p>Mキーで移動モードに切り替え</p>
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
                <p>PまたはBキーでペンモードに切り替え</p>
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
                <p>Eキーで消しゴムモードに切り替え</p>
            </Tooltip>
            <i class="ti ti-eraser"></i>
            <span>消しゴム</span>
        </button>
    </div>
    {#if $gameConfig.photo_mode.tool.type === 'pen'}
        {@const current = $gameConfig.photo_mode.pen.color}
        <div class="config" transition:fly={{ x: 10, duration: 1000 / 60 * 3 }}>
            <p>ペンの太さ</p>
            <Slider
                unit="px"
                min={0}
                max={400}
                step={1}
                clamp={true}
                bind:value={$gameConfig.photo_mode.pen.width}
            />
            <div class="color-picker">
                {#each COLORS as color, i (i)}
                    <button
                        class="color"
                        class:active={current.x === color.x && current.y === color.y && current.z === color.z}
                        style="background: rgb({color.x}, {color.y}, {color.z})"
                        on:click={() => {
                            $gameConfig.photo_mode.pen.color = {
                                x: color.x,
                                y: color.y,
                                z: color.z,
                                w: 255,
                            }
                        }}
                    ></button>
                {/each}
            </div>
        </div>
    {:else if $gameConfig.photo_mode.tool.type === 'eraser'}
        <div class="config" transition:fly={{ x: 10, duration: 1000 / 60 * 3 }}>
            <p>消しゴムの太さ</p>
            <Slider
                unit="px"
                min={0}
                max={400}
                step={1}
                clamp={true}
                bind:value={$gameConfig.photo_mode.eraser.width}
            />
        </div>
    {:else if $gameConfig.photo_mode.tool.type === 'move'}
        <div class="config" transition:fly={{ x: 10, duration: 1000 / 60 * 3 }}>
            <p>アイテムの大きさ</p>
            <Slider
                unit="x"
                min={-10}
                max={10}
                step={0.1}
                clamp={true}
                bind:value={$gameConfig.photo_mode.scale}
            />
        </div>
    {/if}
</div>
<div class="exit">
    {#if screenshot}
        <div class="screenshot">
            {#if screenshot.type === 'taken'}
                <img src={screenshot.url} alt="Screenshot"/>
            {/if}
        </div>
    {/if}
    <button on:click={async () => {
        $scene = {
            type: 'cooking',
        };
    }}>
        キッチンに戻って調整
        <i class="ti ti-arrow-back-up"></i>
    </button>
    <button on:click={async () => {
        screenshot = {
            type: 'taking',
        };
        await obs.screenshotCreate({});
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data } = await obs.screenshotGetLastBinary({});
        if (!data) {
            console.error('No screenshot data received');
            return;
        }
        const blob = new Blob([data], { type: 'image/png' });
        screenshot = {
            type: 'taken',
            url: URL.createObjectURL(blob),
        };
    }} class="primary">
        写真を撮る
        <i class="ti ti-camera"></i>
    </button>
</div>

<style lang="scss">
    .background {
        position: absolute;
        height: 18rem;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(
            to bottom,
            transparent 0%,
            var(--color-bg-1) 100%
        );
        pointer-events: none;
    }
    
    .screen {
        position: absolute;
        left: 4rem;
        bottom: 4rem;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        font-size: 1.6rem;
        gap: 4rem;
        animation: fadeIn 0.1621s ease-in;
    }

    .config {
        align-items: baseline;
        justify-content: center;
        display: flex;
        flex-direction: column;
        bottom: 6rem;
        gap: 1rem;
        font-size: 1.6rem;
        font-weight: 600;

        > p {
            font-size: 1rem;
            font-weight: 600;
            width: 10rem;
            color: var(--color-1);
        }
    }

    .screenshot {
        height: 18rem;
        width: 32rem;
        padding: 0.5rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .color-picker {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.5rem;
        margin-left: 1rem;

        .color {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            touch-action: manipulation;
            outline: 4px solid var(--color-bg-2);
            outline-offset: -1px;

            &::after {
                content: '';
                position: absolute;
                width: 2rem;
                height: 2rem;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                outline: 2px solid var(--color-outline);
            }

            &.active {
                outline-offset: -1px;

                &::before {
                    content: '';
                    position: absolute;
                    width: 2rem;
                    height: 2rem;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    outline: 4px solid var(--color-bg-2);
                    transition: all 0.02621s ease-in-out;
                }

                &::after {
                    content: '';
                    position: absolute;
                    width: 2rem;
                    height: 2rem;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    outline: 4px solid var(--color-1);
                    transition: all 0.02621s ease-in-out;
                }
            }
        }
    }

    .tools {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 1.6rem;
        font-weight: 600;

        @media (max-width: 480px) {
            font-size: 1.2rem;
        }
    }
    
    .tool, .exit button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        color: var(--color-1);
        border-radius: 2px;
        border: none;
        padding: 0.5rem 1.5rem;
        font-weight: 600;
        font-size: 1rem;
        white-space: nowrap;
        cursor: pointer;
        touch-action: manipulation;
        border-radius: 3px;

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }

        > i {
            font-size: 1.2rem;
        }
    }

    .exit {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
        right: 8rem;
        bottom: 4rem;

        > button {
            background: var(--color-bg-2);
        }
        
        > .primary {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }

    .active {
        background: var(--color-1);
        color: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
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
