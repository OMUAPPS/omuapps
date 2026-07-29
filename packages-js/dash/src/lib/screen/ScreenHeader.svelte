<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import type { Keys } from '@omujs/i18n';

    interface Props {
        title?: string;
    }

    let { title = '' }: Props = $props();
</script>

<div class="header">
    <i class={$t(`screen.${title}.icon` as Keys)}></i>
    <div class="title">{$t(`screen.${title}.name` as Keys)}</div>
</div>

<style>
    .header {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        align-items: baseline;
        margin-bottom: 1rem;
        font-size: 1.25rem;
        font-style: normal;
        font-weight: 600;
        line-height: 0;
        color: var(--color-1);
        user-select: none;
    }
</style>
