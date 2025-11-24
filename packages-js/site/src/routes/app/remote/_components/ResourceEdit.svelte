<script lang="ts">
    import { formatBytes } from '$lib/helper.js';
    import { Slider, Tooltip } from '@omujs/ui';
    import type { Resource } from '../remote-app.js';

    interface Props {
        resource: Resource;
    }

    let { resource = $bindable() }: Props = $props();
</script>

<span class="setting">
    <p>名前</p>
    <span>{resource.filename}</span>
</span>
{#if resource.addedAt}
    <span class="setting">
        <p>追加日時</p>
        <time>{new Date(resource.addedAt).toLocaleString()}</time>
    </span>
{/if}
{#if resource.size}
    <span class="setting">
        <Tooltip>
            {resource.size} B
        </Tooltip>
        <p>サイズ</p>
        <span>{formatBytes(resource.size)}</span>
    </span>
{/if}
{#if resource.type === 'album'}
    <span class="setting">
        <p>切り替え時間</p>
        <Slider
            min={0}
            max={10}
            step={0.1}
            unit="秒"
            bind:value={resource.duration}
        />
    </span>
{/if}

<style lang="scss">
    .setting {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 2rem;
        margin: 0.5rem 0;
        width: 100%;

        > p {
            color: var(--color-text);
            font-size: 0.8621rem;
        }
    }
</style>
