<script lang="ts">
    import { Tooltip } from '@omujs/ui';

    export let icon: string;
    export let tooltip: string;
</script>

<button
    class="button"
    type="button"
    on:click
>
    <Tooltip>{tooltip}</Tooltip>
    <i class="ti {icon}" />
</button>

<style lang="scss">
    .button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
        max-height: 100%;
        padding-right: 10px;
        padding-left: 10px;
        font-size: 16px;
        color: var(--color-1);
        background: transparent;
        border: none;
        outline: none;

        &:focus-visible,
        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }
</style>
