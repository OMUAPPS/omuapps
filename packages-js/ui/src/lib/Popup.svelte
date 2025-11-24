<script lang="ts">
    import { BROWSER } from 'esm-env';
    import { afterUpdate, createEventDispatcher, onDestroy } from 'svelte';

    export let noBackground = false;
    export let isOpen = false;
    export let onOpen: () => Promise<void> | void = () => {};

    const eventDistacher = createEventDispatcher<{ open: void; close: void }>();

    let element: HTMLElement;
    let target: HTMLElement;
    let popup: HTMLElement;
    type Rect = { x: number; y: number; width: number; height: number };
    let popupRect: Rect = {
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
    let popupPos: { x: number; y: number } = { x: 0, y: 0 };
    let direction: 'top' | 'bottom' = 'bottom';

    async function handleClick() {
        targetRect = target.getBoundingClientRect();
        await onOpen();
        isOpen = true;
    }

    function handleClickOutside(event: MouseEvent) {
        if (!isOpen) return;
        if (element.contains(event.target as Node)) return;
        if (event.target === target) return;
        isOpen = false;
    }

    $: {
        if (isOpen) {
            eventDistacher('open');
        } else {
            eventDistacher('close');
        }
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    $: {
        const padding = 5;
        if (target && popup) {
            popupRect = popup.getBoundingClientRect();
            direction =
                targetRect.y + targetRect.height + popupRect.height + 10 > window.innerHeight
                    ? 'top'
                    : 'bottom';
            popupPos = {
                x: clamp(
                    targetRect.x + targetRect.width / 2 - popupRect.width / 2,
                    padding,
                    window.innerWidth - popupRect.width - padding,
                ),
                y: clamp(
                    direction === 'bottom'
                        ? targetRect.y + targetRect.height + 10
                        : targetRect.y - popupRect.height - 10,
                    padding,
                    window.innerHeight - popupRect.height - padding,
                ),
            };
        }
    }

    if (BROWSER) {
        afterUpdate(() => {
            if (!element.parentElement) {
                throw new Error('PopupInline must be a child of another element');
            }
            target = element.parentElement;
            if (!target.addEventListener || !target.removeEventListener) {
                throw new Error('target must support addEventListener and removeEventListener');
            }
            target.addEventListener('click', handleClick);
        });

        onDestroy(() => {
            target.removeEventListener('click', handleClick);
        });
    }
</script>

<svelte:window on:click={handleClickOutside} />
<span class="wrapper" bind:this={element}>
    {#if isOpen}
        <div
            class="popup"
            class:background={!noBackground}
            class:top={direction === 'top'}
            style:top="{popupPos.y}px"
            style:left="{popupPos.x}px"
            bind:this={popup}
        >
            <slot close={() => (isOpen = false)} />
        </div>
        <div
            class="pointer"
            class:top={direction === 'top'}
            style:left="{targetRect.x + targetRect.width / 2}px"
            style:top="{direction === 'bottom'
                ? targetRect.y + targetRect.height
                : targetRect.y - 10}px"
        />
    {/if}
</span>

<style lang="scss">
    .popup {
        position: fixed;
        z-index: 200;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-1);
        white-space: nowrap;
        user-select: none;
        filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.1));

        &.background {
            padding: 5px 10px;
            background: var(--color-bg-2);
        }
    }

    .pointer {
        position: fixed;
        z-index: 20;
        content: '';
        user-select: none;
        border: 5px solid transparent;
        border-bottom-color: var(--color-bg-2);
        transform: translateX(-50%);
        filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));

        &.top {
            transform: translateX(-50%) rotate(180deg);
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
