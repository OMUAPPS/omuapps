<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';

    export let title = '';
</script>

<div class="header">
    <i class={$t(`screen.${title}.icon`)}></i>
    <div class="title">{$t(`screen.${title}.name`)}</div>
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
