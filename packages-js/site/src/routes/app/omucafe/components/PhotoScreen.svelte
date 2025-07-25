<script lang="ts">
    import { Slider, Tooltip } from '@omujs/ui';
    import { uploadAssetByBlob } from '../asset/asset.js';
    import { acquireRenderLock, getContext } from '../game/game.js';
    import { uniqueId } from '../game/helper.js';
    import { Time } from '../game/time.js';
    import { removeItemState } from '../item/item-state.js';
    import { getGame } from '../omucafe-app.js';
    import { updateOrder } from '../order/order.js';
    import type { PhotoTakeState, SceneType } from '../scenes/scene.js';
    import PhotoScreenInfo from './PhotoScreenInfo.svelte';

    export let photoMode: SceneType<'photo_mode'>;
    
    const { scene, states, obs, gameConfig, gallery } = getGame();

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

    let timer: number | null = null;
    let taking: Promise<void> | null = null;

    async function update(photoTake: PhotoTakeState | undefined) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!photoTake) {
            return;
        }
        if (photoTake.type === 'countdown') {
            const startTime = photoTake.startTime;
            const duration = photoTake.duration;
            const remaining = startTime + duration - Time.now();
            if (remaining < 0) {
                // eslint-disable-next-line svelte/infinite-reactive-loop
                taking = takePhoto(startTime, duration);
            }
            timer = window.setTimeout(() => {
                update(photoMode.photoTake);
            }, remaining);
        }
        if (photoTake.type === 'taking' && !taking) {
            const startTime = photoTake.startTime;
            const duration = photoTake.duration;
            taking = takePhoto(startTime, duration);
        }
    }

    // eslint-disable-next-line svelte/infinite-reactive-loop
    $: update(photoMode.photoTake);

    async function takePhoto(startTime: number, duration: number) {
        photoMode.photoTake = {
            type: 'taking',
            startTime,
            duration,
        };
        await obs.screenshotCreate({});
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data } = await obs.screenshotGetLastBinary({});
        if (!data) {
            console.error('No screenshot data received');
            return;
        }
        const blob = new Blob([data], { type: 'image/png' });
        const asset = await uploadAssetByBlob(blob);
        await gallery.add({
            id: uniqueId(),
            asset,
            timestamp: new Date().toISOString(),
            order: $states.kitchen.order,
        });
        // eslint-disable-next-line svelte/infinite-reactive-loop
        photoMode.photoTake = {
            type: 'taken',
            asset,
            time: Time.now(),
        };
        taking = null;
    }

    async function startTakePhoto() {
        if (!obs.isConnected()) return;
        photoMode.photoTake = {
            type: 'countdown',
            startTime: Time.now(),
            duration: 3000,
        }
    }
</script>

<div class="background" class:hide={photoMode.photoTake?.type === 'taken'}></div>
<PhotoScreenInfo />
<div class="screen" class:hide={photoMode.photoTake}>
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
        <div class="config">
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
        <div class="config">
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
        <div class="config">
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
{#if photoMode.photoTake?.type === 'taken'}
    <div class="center">
        <button on:click={() => {
            photoMode.photoTake = undefined;
        }}>
            撮り直す
            <i class="ti ti-refresh"></i>
        </button>
        <button on:click={async () => {
            await acquireRenderLock();
            $scene = {
                type: 'kitchen',
                transition: {
                    time: Time.now(),
                }
            }
            const { items, order } = getContext();
            for (const id of photoMode.items) {
                const item = items[id];
                removeItemState(item);
            }
            if (!order) return;
            order.status = {
                type: 'done',
            };
            await updateOrder(order);
        }} class="primary">
            終わる
            <i class="ti ti-check"></i>
        </button>
    </div>
{:else}
    <div class="actions">
        <button on:click={async () => {
            $scene = {
                type: 'kitchen',
            };
        }} class:hide={photoMode.photoTake}>
            キッチンに戻って調整
            <i class="ti ti-arrow-back-up"></i>
        </button>
        <button on:click={startTakePhoto} class="primary" class:hide={photoMode.photoTake}>
            <Tooltip>
                3…2…1…で写真を撮ります
            </Tooltip>
            写真を撮る
            <i class="ti ti-camera"></i>
        </button>
    </div>
{/if}

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
        animation: fadeIn1 0.4621s cubic-bezier(0.12, 0.87, 0.26, 0.97);
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
        animation: fadeIn1 0.0621s cubic-bezier(0.12, 0.87, 0.26, 0.97);

        > p {
            font-size: 1rem;
            font-weight: 600;
            width: 10rem;
            color: var(--color-1);
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
    
    .tool, .actions button {
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

    .actions {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
        right: 8rem;
        bottom: 4rem;
        animation: fadeIn2 0.4621s cubic-bezier(0.12, 0.87, 0.26, 0.97);

        > button {
            background: var(--color-bg-2);
        }
        
        > .primary {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }

    .center {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 1rem;
        height: 12rem;
        padding: 2rem;
        padding-right: 15%;
        background: linear-gradient(
            to bottom,
            transparent 0%,
            var(--color-bg-2) 100%
        );

        > button {
            width: 12rem;
            height: 4rem;
            background: var(--color-bg-1);
            color: var(--color-1);
            font-weight: 600;
            font-size: 1.25rem;
            border: 0;
            transform: skew(-2deg);

            > i {
                margin-left: 0.25rem;
            }

            &:hover {
                outline: 1px solid var(--color-1);
                outline-offset: 0.5rem;
                transform: skew(-2deg) scale(0.98);
                transition: all 0.1621s cubic-bezier(0.12, 0.87, 0.26, 0.97);
            }
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

    @keyframes fadeIn1 {
        0% {
            opacity: 0.0;
            transform: translate(-5rem);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeIn2 {
        0% {
            opacity: 0.0;
            transform: translate(5rem);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .hide {
        animation: forwards hide 0.4621s cubic-bezier(0.12, 0.87, 0.26, 0.97);
        pointer-events: none;
    }

    @keyframes hide {
        0% {
            opacity: 1;
            transform: translateX(0);
        }
        100% {
            opacity: 0.0;
            transform: translate(5rem);
        }
    }
</style>
