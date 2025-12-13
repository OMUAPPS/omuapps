<script lang="ts">
    import { onDestroy, tick, type Snippet } from 'svelte';
    import type { Action } from 'svelte/action';
    import { getPopupId, popupAdd, popupRemove, type PopupEntry } from './stores';

    interface Props {
        active?: boolean;
        open?: (element: HTMLElement) => void;
        children?: Snippet<[(element: HTMLElement) => void]>;
        content?: Snippet<[]>;
    }

    let {
        active = $bindable(false),
        open = $bindable((element) => {
            if (!target) return;
            attachParent(element);
        }),
        children,
        content,
    }: Props = $props();
    let target: HTMLElement | undefined = $state();
    let popup: HTMLElement | undefined = $state();
    type Rect = { x: number; y: number; width: number; height: number };
    // svelte-ignore non_reactive_update
    let popupRect: Rect = {
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
    let popupPos: { x: number; y: number } = $state({ x: 0, y: 0 });
    let direction: 'up' | 'down' = $state('down');

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    async function update(target: HTMLElement | undefined, popup: HTMLElement | undefined): Promise<void> {
        await tick();
        if (!target || !popup) return;
        const margin = 10;
        const arrowSize = 10;
        popupRect = popup.getBoundingClientRect();
        targetRect = target.getBoundingClientRect();
        const targetBounds = {
            top: targetRect.y,
            bottom: targetRect.y + targetRect.height,
            centerX: targetRect.x + targetRect.width / 2,
        };
        const bounds = document.fullscreenElement ? document.fullscreenElement.getBoundingClientRect() : {
            left: margin,
            top: margin,
            right: window.innerWidth - margin,
            bottom: window.innerHeight - margin,
        };
        direction =
            targetBounds.bottom + popupRect.height > bounds.bottom
                ? 'up'
                : 'down';
        popupPos = {
            x: clamp(
                targetBounds.centerX - popupRect.width / 2,
                bounds.left,
                bounds.right - popupRect.width,
            ),
            y: clamp(
                direction === 'down'
                    ? targetBounds.bottom + arrowSize
                    : targetBounds.top - popupRect.height - arrowSize,
                bounds.top,
                bounds.bottom - popupRect.height,
            ),
        };
    }

    $effect(() => {
        update(target, popup);
    });

    let entry: PopupEntry | undefined = undefined;
    const id = getPopupId();

    function attachParent(element: HTMLElement) {
        if (entry) {
            popupRemove(entry);
            entry = undefined;
            active = false;
            return;
        }
        if (!element) {
            throw new Error('PopupInline must be a child of another node');
        }
        target = element;
        if (!target.addEventListener || !target.removeEventListener) {
            throw new Error(
                'target must support addEventListener and removeEventListener',
            );
        }
        entry = {
            id,
            render,
            element,
        };
        popupAdd(entry);
        active = true;
    }

    onDestroy(() => {
        if (entry) {
            popupRemove(entry);
            entry = undefined;
            active = false;
        }
    });

    function usePopup(node: HTMLElement): ReturnType<Action> {
        if (!entry) return;
        entry.content = node;
        return {
            destroy: () => {
                if (!entry) return;
                popupRemove(entry);
                entry = undefined;
                active = false;
            },
        };
    }
</script>

<span class="wrapper" bind:this={target}></span>
{@render children?.(open)}
{#snippet render()}
    <div
        class="popup"
        class:top={direction === 'up'}
        style:left="{popupPos.x}px"
        style:top="{popupPos.y}px"
        bind:this={popup}
        use:usePopup
    >
        {@render content?.()}
    </div>
    <div
        class="arrow"
        class:top={direction === 'up'}
        style:left="{targetRect.x + targetRect.width / 2}px"
        style:top="{(direction === 'down'
            ? popupPos.y - 10
            : popupPos.y + popupRect.height)}px"
    ></div>
{/snippet}

<style lang="scss">
    .popup {
        position: fixed;
        z-index: 200;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        padding: 1rem 1.5rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        filter: drop-shadow(0 0.2rem 0 var(--color-outline));
        border-radius: 2px;
    }

    .arrow {
        position: fixed;
        z-index: 20;
        pointer-events: none;
        content: "";
        user-select: none;
        border: 0.4rem solid transparent;
        border-bottom-color: var(--color-outline);
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
