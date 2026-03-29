<script lang="ts">
    import { Vec2 } from '$lib/math/vec2';
    import { Slider } from '@omujs/ui';
    import type { Transform } from '../core/transform';

    interface Props {
        transform: Transform;
    }

    let { transform = $bindable() }: Props = $props();

    let { offset, right, up } = $derived(transform);
</script>

<div class="transform">
    <small>位置</small>
    <label>
        x
        <Slider bind:value={transform.offset.x} min={-400} max={400} step={1} unit="px" clamp={false} />
    </label>
    <label>
        y
        <Slider bind:value={transform.offset.y} min={-400} max={400} step={1} unit="px" clamp={false} />
    </label>
    <small>スケール</small>
    <label>
        x
        <Slider bind:value={() => {
            return Math.sqrt(right.x * right.x + right.y * right.y) * 100;
        }, (newScale) => {
            const scale = Math.sqrt(right.x * right.x + right.y * right.y);
            transform.right = new Vec2(right.x, right.y).scale(Math.max(newScale / scale / 100, 1e-2));
        }} min={1} max={200} step={1} unit="%" clamp={false} />
    </label>
    <label>
        y
        <Slider bind:value={() => {
            return Math.sqrt(up.x * up.x + up.y * up.y) * 100;
        }, (newScale) => {
            const scale = Math.sqrt(up.x * up.x + up.y * up.y);
            transform.up = new Vec2(up.x, up.y).scale(Math.max(newScale / scale / 100, 1e-2));
        }} min={1} max={200} step={1} unit="%" clamp={false} />
    </label>
    <label>
        rotation
        <Slider bind:value={() => {
            return Math.atan2(up.y, up.x) * 180 / Math.PI;
        }, (newRotation) => {
            const angle = newRotation * Math.PI / 180;
            transform.up = new Vec2(Math.cos(angle), Math.sin(angle));
            transform.right = new Vec2(transform.up.y, -transform.up.x).scale(Math.sqrt(right.x * right.x + right.y * right.y));
        }} min={0} max={360} step={1} unit="°" clamp={false} />
    </label>
</div>

<style lang="scss">
    .transform {
        display: flex;
        flex-direction: column;
    }
</style>
