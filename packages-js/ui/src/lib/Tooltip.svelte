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
            offset = getPositionRoot(target);
        }
    }

    $: {
        update(target, tooltip);
    }

    let keyboardFocus = false;

    function handleFocus() {
        if (!keyboardFocus) {
            showTooltip();
        }
    }
    
    function handleKeyDown() {
        keyboardFocus = true;
    }

    function attachParent(node: HTMLElement) {
        if (!node.parentElement) {
            throw new Error('TooltipInline must be a child of another node');
        }
        target = node.parentElement;
        if (!target.addEventListener || !target.removeEventListener) {
            throw new Error(
                'target must support addEventListener and removeEventListener',
            );
        }
        target.addEventListener('mouseenter', showTooltip);
        target.addEventListener('mouseleave', hideTooltip);
        target.addEventListener('focus', handleFocus);
        target.addEventListener('blur', hideTooltip);

        return {
            destroy() {
                target.removeEventListener('mouseenter', showTooltip);
                target.removeEventListener('mouseleave', hideTooltip);
                target.removeEventListener('focus', handleFocus);
                target.removeEventListener('blur', hideTooltip);
            },
        };
    }

    function log(value: number) {
        if (value === 0) {
            return 0;
        }
        if (value < 0) {
            return -Math.log(-value);
        }
        return Math.log(value);
    }

    let lastMouseMoveTime = 0;
    let lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
    let isMouseMoving = false;
    let timeout: number;
    let averageMouseVelocity = 0;
    let lastMouseVelocity = 0;
    let mouseJerk = 0;
    function handleMouseMove(event: MouseEvent) {
        if (keyboardFocus) {
            hideTooltip();
            keyboardFocus = false;
            return;
        }
        if (event.timeStamp - lastMouseMoveTime < 1000 / 60) {
            return;
        }
        lastMouseMoveTime = event.timeStamp;
        averageMouseVelocity = average(
            'velocity',
            Math.sqrt(
                Math.pow(event.clientX - lastMousePos.x, 2) +
                    Math.pow(event.clientY - lastMousePos.y, 2),
            ),
            2,
        );
        mouseJerk = averageMouseVelocity - lastMouseVelocity;
        lastMouseVelocity = averageMouseVelocity;
        lastMousePos = { x: event.clientX, y: event.clientY };
        if (
            log(averageMouseVelocity) < 2 ||
            max('jerk', log(mouseJerk)) < 2.6
        ) {
            return;
        }
        if (isMouseMoving) {
            clearTimeout(timeout);
        }
        if (!show) {
            isMouseMoving = true;
        }
        timeout = window.setTimeout(() => {
            isMouseMoving = false;
        }, 1000 / 30);
    }

    const averageTimes: Record<string, number[]> = {};
    function average(key: string, value: number, length = 10) {
        if (!averageTimes[key]) {
            averageTimes[key] = [];
        }
        averageTimes[key].push(value);
        if (averageTimes[key].length > length) {
            averageTimes[key].shift();
        }
        return (
            averageTimes[key].reduce((a, b) => a + b, 0) /
            averageTimes[key].length
        );
    }
    const maxTimes: Record<string, number[]> = {};
    function max(key: string, value: number) {
        if (!maxTimes[key]) {
            maxTimes[key] = [];
        }
        maxTimes[key].push(value);
        if (maxTimes[key].length > 10) {
            maxTimes[key].shift();
        }
        return Math.max(...maxTimes[key]);
    }
</script>

<svelte:window on:mousemove={handleMouseMove} on:keydown={handleKeyDown} />
<span class="wrapper" use:attachParent>
    {#if show && !isMouseMoving}
        <div
            class="tooltip"
            class:background={!noBackground}
            class:top={direction === 'up'}
            style:left="{tooltipPos.x - offset.x}px"
            style:top="{tooltipPos.y - offset.y}px"
            bind:this={tooltip}
        >
            <slot />
        </div>
        <div
            class="arrow"
            class:top={direction === 'up'}
            style:left="{targetRect.x + targetRect.width / 2 - offset.x}px"
            style:top="{(direction === 'down'
                ? targetRect.y + targetRect.height
                : targetRect.y - 10) - offset.y}px"
        ></div>
    {/if}
</span>

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
