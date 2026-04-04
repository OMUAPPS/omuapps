<script lang="ts">
    import { Vec2 } from '$lib/math/vec2';
    import type { Transform } from '../core/transform';

    interface Props {
        transform: Transform;
    }

    // --- 定数 ---
    const MIN_SCALE = 0.01;
    const RAD_TO_DEG = 180 / Math.PI;
    const DEG_TO_RAD = Math.PI / 180;

    // --- プロパティ・状態 ---
    let { transform = $bindable() }: Props = $props();

    type DragState =
        | { kind: 'transform'; startMouse: Vec2; startOffset: Vec2 }
        | { kind: 'rotate'; startTheta: number; startRotation: number; upThetaOffset: number; startScale: Vec2; rect: DOMRect }
        | { kind: 'scale-corner'; startScaleLen: number; startRight: Vec2; startUp: Vec2; rect: DOMRect }
        | { kind: 'scale-edge'; startScaleLen: number; startRight: Vec2; startUp: Vec2; rect: DOMRect; axis: 'x' | 'y' };

    let drag: DragState | undefined = $state();
    let dragElement: HTMLDivElement;

    // --- 派生状態 ---
    let { offset, right, up } = $derived(transform);
    let rotationRad = $derived(Math.atan2(right.y, right.x));
    let rotationDeg = $derived(rotationRad * RAD_TO_DEG);

    // --- ユーティリティ ---
    const getMouseOffset = (e: MouseEvent, rect: DOMRect) => {
        return new Vec2(
            e.clientX - rect.left - rect.width / 2,
            e.clientY - rect.top - rect.height / 2,
        );
    };

    // --- ハンドラー ---
    function handleMouseMove(event: MouseEvent) {
        if (!drag) return;

        if (drag.kind === 'transform') {
            const delta = new Vec2(event.clientX, event.clientY).sub(drag.startMouse);
            transform.offset = drag.startOffset.add(delta);
        } else if (drag.kind === 'rotate') {
            const mouseOffset = getMouseOffset(event, drag.rect);
            const currentTheta = Math.atan2(mouseOffset.y, mouseOffset.x);
            const deltaTheta = currentTheta - drag.startTheta;
            const newTheta = drag.startRotation + deltaTheta;

            transform.right = {
                x: Math.cos(newTheta) * drag.startScale.x,
                y: Math.sin(newTheta) * drag.startScale.x,
            };
            transform.up = {
                x: Math.cos(newTheta + drag.upThetaOffset) * drag.startScale.y,
                y: Math.sin(newTheta + drag.upThetaOffset) * drag.startScale.y,
            };
        } else if (drag.kind === 'scale-corner' || drag.kind === 'scale-edge') {
            const mouseOffset = getMouseOffset(event, drag.rect);
            const currentLen = drag.kind === 'scale-edge'
                ? (drag.axis === 'x' ? Math.abs(mouseOffset.x) : Math.abs(mouseOffset.y))
                : mouseOffset.length;

            let scaleRatio = Math.max(currentLen / drag.startScaleLen, MIN_SCALE);

            if (drag.kind === 'scale-corner' || drag.axis === 'x') {
                transform.right = drag.startRight.scale(scaleRatio);
            }
            if (drag.kind === 'scale-corner' || drag.axis === 'y') {
                transform.up = drag.startUp.scale(scaleRatio);
            }
        }
    }
</script>

<svelte:window
    onmousemove={handleMouseMove}
    onmouseup={() => drag = undefined}
/>

<div class="edit">
    <div class="transform-container">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="drag-handle"
            bind:this={dragElement}
            style:rotate="{rotationRad}rad"
            onmousedown={(e) => drag = {
                kind: 'transform',
                startMouse: new Vec2(e.clientX, e.clientY),
                startOffset: Vec2.from(offset),
            }}
        >
            <i class="ti ti-arrows-move"></i>

            {#each Array(4) as _, i (i)}
                {@const angle = (i * Math.PI / 2) + (Math.PI / 4)}
                <div
                    class="control rotate"
                    style="transform: rotate({angle}rad) translateX(5rem);"
                    onmousedown={(e) => {
                        e.stopPropagation();
                        const rect = dragElement.getBoundingClientRect();
                        const mOffset = getMouseOffset(e, rect);
                        drag = {
                            kind: 'rotate',
                            rect,
                            startTheta: Math.atan2(mOffset.y, mOffset.x),
                            startRotation: Math.atan2(right.y, right.x),
                            upThetaOffset: Math.atan2(up.y, up.x) - Math.atan2(right.y, right.x),
                            startScale: new Vec2(Vec2.from(right).length, Vec2.from(up).length),
                        };
                    }}
                >
                    <i class="ti ti-rotate-clockwise"></i>
                </div>

                <div
                    class="control scale-corner"
                    style="transform: rotate({angle}rad) translateX(3.5rem);"
                    onmousedown={(e) => {
                        e.stopPropagation();
                        const rect = dragElement.getBoundingClientRect();
                        drag = {
                            kind: 'scale-corner',
                            rect,
                            startRight: Vec2.from(right),
                            startUp: Vec2.from(up),
                            startScaleLen: getMouseOffset(e, rect).length,
                        };
                    }}
                >
                    <i class="ti ti-dots"></i>
                </div>
            {/each}

            {#each Array(4) as _, i (i)}
                {@const angle = i * Math.PI / 2}
                <div
                    class="control scale-edge"
                    style="transform: rotate({angle}rad) translateX(2.5rem);"
                    onmousedown={(e) => {
                        e.stopPropagation();
                        const rect = dragElement.getBoundingClientRect();
                        const mOffset = getMouseOffset(e, rect);
                        const axis = i % 2 === 0 ? 'x' : 'y';
                        drag = {
                            kind: 'scale-edge',
                            rect,
                            axis,
                            startRight: Vec2.from(right),
                            startUp: Vec2.from(up),
                            startScaleLen: axis === 'x' ? Math.abs(mOffset.x) : Math.abs(mOffset.y),
                        };
                    }}
                >
                    <i class="ti ti-point"></i>
                </div>
            {/each}
        </div>
    </div>

    <div class="inspector">
        <label>X <input type="number" bind:value={offset.x} /></label>
        <label>Y <input type="number" bind:value={offset.y} /></label>

        <label>
            幅
            <input
                type="number"
                value={Vec2.from(right).length * 100}
                onchange={(e) => {
                    if (Number.isNaN(e.currentTarget.valueAsNumber) || !Number.isFinite(e.currentTarget.valueAsNumber)) {
                        return;
                    }
                    const val = Math.max(e.currentTarget.valueAsNumber / 100, MIN_SCALE);
                    transform.right = Vec2.from(right).normalized.scale(val);
                }}
            />
        </label>

        <label>
            高さ
            <input
                type="number"
                value={Vec2.from(up).length * 100}
                onchange={(e) => {
                    if (Number.isNaN(e.currentTarget.valueAsNumber) || !Number.isFinite(e.currentTarget.valueAsNumber)) {
                        return;
                    }
                    const val = Math.max(e.currentTarget.valueAsNumber / 100, MIN_SCALE);
                    transform.up = Vec2.from(up).normalized.scale(val);
                }}
            />
        </label>

        <label>
            回転 (°)
            <input
                type="number"
                value={rotationDeg}
                onchange={(e) => {
                    if (Number.isNaN(e.currentTarget.valueAsNumber) || !Number.isFinite(e.currentTarget.valueAsNumber)) {
                        return;
                    }
                    const newRad = e.currentTarget.valueAsNumber * DEG_TO_RAD;
                    const upOffset = Math.atan2(up.y, up.x) - Math.atan2(right.y, right.x);
                    const s = new Vec2(Vec2.from(right).length, Vec2.from(up).length);
                    transform.right = { x: Math.cos(newRad) * s.x, y: Math.sin(newRad) * s.x };
                    transform.up = { x: Math.cos(newRad + upOffset) * s.y, y: Math.sin(newRad + upOffset) * s.y };
                }}
            />
        </label>
    </div>
</div>

<style lang="scss">
    .edit {
        display: flex;
        gap: 1rem;
        background: var(--color-bg-1);
        color: var(--color-1);
    }

    .transform-container {
        padding: 2.5rem;
        outline: 1px solid var(--color-outline);
        background: var(--color-bg-1);
    }

    .drag-handle {
        position: relative;
        width: 6rem;
        height: 6rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        font-size: 1.5rem;
    }

    .control {
        position: absolute;
        width: 1.8rem;
        height: 1.8rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        transition: transform 0.1s;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }
    }

    .rotate { cursor: grab; }
    .scale-corner { cursor: nwse-resize; }
    .scale-edge { cursor: e-resize; }

    .inspector {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 150px;

        label {
            display: grid;
            grid-template-columns: 1fr 2fr;
            align-items: center;
            font-size: 0.8rem;
        }

        input {
            width: 100%;
            padding: 2px 4px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--color-outline);
            color: inherit;
            &:focus { outline: 1px solid var(--color-1); }
        }
    }
</style>
