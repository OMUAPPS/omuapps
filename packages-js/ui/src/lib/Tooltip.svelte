<script lang="ts">
    export let noBackground = false;
    export let show = false;
    let target: HTMLElement;

    let tooltip: HTMLElement;
    type Rect = { x: number; y: number; width: number; height: number };
    let tooltipRect: Rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    };
    let targetRect: Rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    };
    let tooltipPos: { x: number; y: number } = { x: 0, y: 0 };
    let offset: { x: number; y: number } = { x: 0, y: 0 };
    let direction: 'up' | 'down' = 'down';

    function showTooltip() {
        show = true;
        targetRect = target.getBoundingClientRect();
    }

    function hideTooltip() {
        show = false;
    }

    function getPositionRoot(element: HTMLElement): { x: number; y: number } {
        let currentElement: HTMLElement | null = element;
        while (currentElement) {
            const style = getComputedStyle(currentElement);
            if (
                style.getPropertyValue('container-type') === 'inline-size' ||
                style.getPropertyValue('transform') !== 'none'
            ) {
                const rect = currentElement.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y,
                };
            }
            currentElement = currentElement.parentElement;
        }
        return { x: 0, y: 0 };
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    function update(target: HTMLElement, tooltip: HTMLElement): void {
        const margin = 10;
        const arrowSize = 10;
        if (target && tooltip) {
            tooltipRect = tooltip.getBoundingClientRect();
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
            direction = targetBounds.bottom + tooltipRect.height > bounds.bottom ? 'up' : 'down';
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
            offset = getPositionRoot(target);
        }
    }

    $: {
        update(target, tooltip);
    }

    function attachParent(node: HTMLElement) {
        if (!node.parentElement) {
            throw new Error('TooltipInline must be a child of another node');
        }
        target = node.parentElement;
        if (!target.addEventListener || !target.removeEventListener) {
            throw new Error('target must support addEventListener and removeEventListener');
        }
        target.addEventListener('mouseenter', showTooltip);
        target.addEventListener('mouseleave', hideTooltip);

        return {
            destroy() {
                target.removeEventListener('mouseenter', showTooltip);
                target.removeEventListener('mouseleave', hideTooltip);
            },
        };
    }
</script>

<span class="wrapper" use:attachParent>
    {#if show}
        <div
            class="tooltip"
            class:background={!noBackground}
            class:top={direction === 'up'}
            style="left: {tooltipPos.x - offset.x}px; top: {tooltipPos.y - offset.y}px;"
            bind:this={tooltip}
        >
            <slot />
        </div>
        <div
            class="arrow"
            class:top={direction === 'up'}
            style="left: {targetRect.x + targetRect.width / 2 - offset.x}px; top: {(direction ===
            'down'
                ? targetRect.y + targetRect.height
                : targetRect.y - 10) - offset.y}px;"
        />
    {/if}
</span>

<style lang="scss">
    .tooltip {
        position: fixed;
        z-index: 200;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;

        &.background {
            padding: 5px 10px;
            background: #000;
        }
    }

    .arrow {
        position: fixed;
        z-index: 20;
        pointer-events: none;
        content: '';
        user-select: none;
        border: 6px solid transparent;
        border-bottom-color: #000;
        transform: translateX(-50%);

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
