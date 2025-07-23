<script lang="ts">
    import { Button, Slider } from '@omujs/ui';
    import type { Transform } from '../game/transform.js';

    export let transform: Transform;
    export let type: 'matrix' | 'transform' = 'transform';

    function getScale(): {
        scaleX: number,
        scaleY: number,
    } {
        const { right, up } = transform;
        const scaleX = Math.sqrt(right.x * right.x + right.y * right.y);
        const scaleY = Math.sqrt(up.x * up.x + up.y * up.y);
        return {
            scaleX: scaleX,
            scaleY: scaleY
        };
    }

    function setScale(scale: {x: number, y: number}) {
        const { right, up } = transform;
        const scaleX = Math.sqrt(right.x * right.x + right.y * right.y);
        const scaleY = Math.sqrt(up.x * up.x + up.y * up.y);
        const newRight = {
            x: (right.x / scaleX) * scale.x,
            y: (right.y / scaleX) * scale.x
        };
        const newUp = {
            x: (up.x / scaleY) * scale.y,
            y: (up.y / scaleY) * scale.y
        };
        transform = {
            ...transform,
            right: newRight,
            up: newUp
        };
    }

    function getRotation(): number {
        const { right, up } = transform;
        return Math.atan2(right.y, right.x);
    }

    function setRotation(angle: number) {
        const { right, up } = transform;
        const scaleX = Math.sqrt(right.x * right.x + right.y * right.y);
        const scaleY = Math.sqrt(up.x * up.x + up.y * up.y);
        transform = {
            ...transform,
            right: {
                x: Math.cos(angle) * scaleX,
                y: Math.sin(angle) * scaleX
            },
            up: {
                x: -Math.sin(angle) * scaleY,
                y: Math.cos(angle) * scaleY
            }
        };
    }
</script>

<div class="transform">
    {#if type === 'matrix'}
        right
        <label>
            x
            <input type="number" step="0.01" bind:value={transform.right.x} />
        </label>
        <label>
            y
            <input type="number" step="0.01" bind:value={transform.right.y} />
        </label>
        up
        <label>
            x
            <input type="number" step="0.01" bind:value={transform.up.x} />
        </label>
        <label>
            y
            <input type="number" step="0.01" bind:value={transform.up.y} />
        </label>
        offset
        <label>
            x
            <input type="number" step="0.01" bind:value={transform.offset.x} />
        </label>
        <label>
            y
            <input type="number" step="0.01" bind:value={transform.offset.y} />
        </label>
    {:else}
        {@const { scaleX, scaleY } = getScale()}
        rotation
        <Slider
            min={-Math.PI}
            max={Math.PI}
            step={0.01}
            value={getRotation()}
            handleChange={(value) => {
                setRotation(value);
            }}
        />
        scaleX
        <Slider
            min={0.1}
            max={10}
            step={0.01}
            value={scaleX}
            handleChange={(value) => {
                setScale({ x: value, y: scaleY });
            }}
        />
        scaleY
        <Slider
            min={0.1}
            max={10}
            step={0.01}
            value={scaleY}
            handleChange={(value) => {
                setScale({ x: scaleX, y: value });
            }}
        />
        offsetX
        <Slider
            min={-400}
            max={400}
            step={1}
            clamp={false}
            bind:value={transform.offset.x}
        />
        offsetY
        <Slider
            min={-400}
            max={400}
            step={1}
            clamp={false}
            bind:value={transform.offset.y}
        />
    {/if}
    <span>
        <Button onclick={() => {
            transform = {
                right: { x: 1, y: 0 },
                up: { x: 0, y: 1 },
                offset: { x: 0, y: 0 }
            }
        }}>
            Reset
            <i class="ti ti-refresh"></i>
        </Button>
    </span>
</div>

<style lang="scss">
    .transform {
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        padding: 1rem;
        width: 100%;
    }
</style>
