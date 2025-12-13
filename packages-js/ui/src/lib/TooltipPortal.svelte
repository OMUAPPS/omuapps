<script lang="ts">
    import { tooltipStack, type TooltipEntry } from './stores';

    let top: TooltipEntry | undefined = $state();

    function getDepth(element: HTMLElement): number {
        let depth = 0;
        let current: HTMLElement | null = element;
        while (current) {
            depth++;
            current = current.parentElement;
        }
        return depth;
    }

    function updateElement(target: Element) {
        let deepest: TooltipEntry | undefined = undefined;
        let depth = -1;
        for (const entry of $tooltipStack) {
            const el = entry.element.parentElement;
            if (el && el.contains(target)) {
                const elDepth = getDepth(el);
                if (elDepth > depth) {
                    depth = elDepth;
                    deepest = entry;
                }
            }
        }
        top = deepest;
    }

    function onmousemove(event: MouseEvent) {
        if (!event.target) return;
        if (!$tooltipStack.length) {
            top = undefined;
            return;
        }
        updateElement(event.target as HTMLElement);
    }

    function reset() {
        top = undefined;
    }

    function onkeydown() {
        requestAnimationFrame(() => {
            if (!document.activeElement) return;
            updateElement(document.activeElement);
        });
    }
</script>

<svelte:window
    {onmousemove}
    onscroll={reset}
    {onkeydown}
    onmouseout={() => {top = undefined;}}
/>
{#if top}
    <svelte:boundary onerror={(error) => {
        console.error(error);
    }}>
        {@render top.render()}
        {#snippet failed()}
            aaaaaa
        {/snippet}
    </svelte:boundary>
{/if}
