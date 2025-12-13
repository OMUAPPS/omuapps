<script lang="ts">
    import { onDestroy, tick } from 'svelte';
    import { getTooltipId, tooltipAdd, tooltipRemove, type TooltipEntry } from './stores';

    interface Props {
        noBackground?: boolean;
        children?: import('svelte').Snippet;
    }

    let { noBackground = false, children }: Props = $props();
    let target: HTMLElement | undefined = $state();
    let tooltip: HTMLElement | undefined = $state();
    type Rect = { x: number; y: number; width: number; height: number };
    // svelte-ignore non_reactive_update
    let tooltipRect: Rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    };
    // svelte-ignore non_reactive_update
    let targetRect: Rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    };
    let tooltipPos: { x: number; y: number } = $state({ x: 0, y: 0 });
    let direction: 'up' | 'down' = $state('down');

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    async function update(target: HTMLElement | undefined, tooltip: HTMLElement | undefined): Promise<void> {
        await tick();
        if (!target || !tooltip) return;
        const margin = 10;
        const arrowSize = 10;
        tooltipRect = tooltip.getBoundingClientRect();
        targetRect = target.getBoundingClientRect();
        const targetBounds = {
            top: targetRect.y,
            bottom: targetRect.y + targetRect.height,
            centerX: targetRect.x + targetRect.width / 2,
        };
        const bounds = {
            left: margin,
            top: margin,
            right: window.innerWidth - margin,
            bottom: window.innerHeight - margin,
        };
        direction =
            targetBounds.bottom + tooltipRect.height > bounds.bottom
                ? 'up'
                : 'down';
        tooltipPos = {
            x: clamp(
                targetBounds.centerX - tooltipRect.width / 2,
                bounds.left,
                bounds.right - tooltipRect.width,
            ),
            y: clamp(
                direction === 'down'
                    ? targetBounds.bottom + arrowSize
                    : targetBounds.top - tooltipRect.height - arrowSize,
                bounds.top,
                bounds.bottom - tooltipRect.height,
            ),
        };
    }

    $effect(() => {
        update(target, tooltip);
    });

    let entry: TooltipEntry | undefined = undefined;

    function attachParent(element: HTMLElement) {
        if (!element.parentElement) {
            throw new Error('TooltipInline must be a child of another node');
        }
        target = element.parentElement;
        if (!target.addEventListener || !target.removeEventListener) {
            throw new Error(
                'target must support addEventListener and removeEventListener',
            );
        }
        entry = {
            id: getTooltipId(),
            render,
            element,
        };
        tooltipAdd(entry);
    }

    let destroyed = $state(false);

    onDestroy(() => {
        destroyed = true;
        if (entry) {
            tooltipRemove(entry);
        }
    });
</script>

<span class="wrapper" use:attachParent></span>
{#snippet render()}
    {#if !destroyed}
        <div
            class="tooltip"
            class:background={!noBackground}
            class:top={direction === 'up'}
            style:left="{tooltipPos.x}px"
            style:top="{tooltipPos.y}px"
            bind:this={tooltip}
        >
            {@render children?.()}
        </div>
        <div
            class="arrow"
            class:top={direction === 'up'}
            style:left="{targetRect.x + targetRect.width / 2}px"
            style:top="{(direction === 'down'
                ? tooltipPos.y - 10
                : tooltipPos.y + tooltipRect.height)}px"
        ></div>
    {/if}
{/snippet}

<style lang="scss">
    .tooltip {
        position: fixed;
        z-index: 200;
        font-size: 0.75rem;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;

        &.background {
            padding: 0.3rem 0.6rem;
            background: #000;
        }
    }

    .arrow {
        position: fixed;
        z-index: 20;
        pointer-events: none;
        content: "";
        user-select: none;
        border: 0.4rem solid transparent;
        border-bottom-color: #000;
        transform: translate(-50%, -15%);

        &.top {
            transform: translateX(-50%) scaleY(-1);
        }
    }

    .wrapper {
        position: fixed;
        z-index: 200;
        width: 0;
        height: 0;
        appearance: none;
        background: none;
        border: none;
    }
</style>
