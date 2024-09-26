<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';

    export let title = '';
</script>

<div class="header">
    <i class={$t(`screen.${title}.icon`)} />
    <div class="title">{$t(`screen.${title}.name`)}</div>
</div>

<style>
    .header {
        display: flex;
        flex-direction: row;
        gap: 10px;
        align-items: baseline;
        height: 32px;
        font-size: 18px;
        font-style: normal;
        font-weight: 600;
        line-height: 0;
        color: var(--color-1);
        user-select: none;
    }
</style>
