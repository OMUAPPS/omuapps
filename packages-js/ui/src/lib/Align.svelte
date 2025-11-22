<script lang="ts" module>
    export type AlignType =
        | 'start'
        | 'middle'
        | 'end';
</script>
<script lang="ts">
    import Tooltip from './Tooltip.svelte';

    interface Props {
        horizontal?: AlignType | undefined;
        vertical?: AlignType | undefined;
    }

    let { horizontal = $bindable(undefined), vertical = $bindable(undefined) }: Props = $props();
</script>

<div class="container" class:horizontal={horizontal} class:vertical={vertical}>
    <button
        class="vertical horizontal"
        onclick={() => {
            if (vertical) vertical = 'start';
            if (horizontal) horizontal = 'start';
        }}
        class:selected={vertical === 'start' && horizontal === 'start'}
    >
        <Tooltip>
            左上
        </Tooltip>
        <i class="ti ti-box-align-top-left"></i>
    </button>
    <button
        class="vertical"
        onclick={() => {
            if (vertical) vertical = 'start';
            if (horizontal) horizontal = 'middle';
        }}
        class:selected={vertical === 'start' && horizontal === 'middle'}
    >
        <Tooltip>
            上
        </Tooltip>
        <i class="ti ti-box-align-top"></i>
    </button>
    <button
        class="vertical horizontal"
        onclick={() => {
            if (vertical) vertical = 'start';
            if (horizontal) horizontal = 'end';
        }}
        class:selected={vertical === 'start' && horizontal === 'end'}
    >
        <Tooltip>
            右上
        </Tooltip>
        <i class="ti ti-box-align-top-right"></i>
    </button>
    <button
        class="horizontal"
        onclick={() => {
            if (vertical) vertical = 'middle';
            if (horizontal) horizontal = 'start';
        }}
        class:selected={vertical === 'middle' && horizontal === 'start'}
    >
        <Tooltip>
            左
        </Tooltip>
        <i class="ti ti-box-align-left"></i>
    </button>
    <button
        onclick={() => {
            if (vertical) vertical = 'middle';
            if (horizontal) horizontal = 'middle';
        }}
        class:selected={vertical === 'middle' && horizontal === 'middle'}
    >
        <Tooltip>
            真ん中
        </Tooltip>
        <i class="ti ti-box-margin"></i>
    </button>
    <button
        class="horizontal"
        onclick={() => {
            if (vertical) vertical = 'middle';
            if (horizontal) horizontal = 'end';
        }}
        class:selected={vertical === 'middle' && horizontal === 'end'}
    >
        <Tooltip>
            右
        </Tooltip>
        <i class="ti ti-box-align-right"></i>
    </button>
    <button
        class="vertical horizontal"
        onclick={() => {
            if (vertical) vertical = 'end';
            if (horizontal) horizontal = 'start';
        }}
        class:selected={vertical === 'end' && horizontal === 'start'}
    >
        <Tooltip>
            左下
        </Tooltip>
        <i class="ti ti-box-align-bottom-left"></i>
    </button>
    <button
        class="vertical"
        onclick={() => {
            if (vertical) vertical = 'end';
            if (horizontal) horizontal = 'middle';
        }}
        class:selected={vertical === 'end' && horizontal === 'middle'}
    >
        <Tooltip>
            下
        </Tooltip>
        <i class="ti ti-box-align-bottom"></i>
    </button>
    <button
        class="vertical horizontal"
        onclick={() => {
            if (vertical) vertical = 'end';
            if (horizontal) horizontal = 'end';
        }}
        class:selected={vertical === 'end' && horizontal === 'end'}
    >
        <Tooltip>
            右下
        </Tooltip>
        <i class="ti ti-box-align-bottom-right"></i>
    </button>
</div>

<style lang="scss">
    .container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;

        &:not(.horizontal) {
            > .horizontal {
                display: none;
            }
        }

        &:not(.vertical) {
            > .vertical {
                display: none;
            }
        }
    }

    .ti {
        font-size: 1rem;
    }

    button {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.5rem;
        border: 1px solid var(--color-outline);
        background: transparent;
        cursor: pointer;

        &.selected {
            color: var(--color-bg-1);
            background: var(--color-1);
        }
    }
</style>
