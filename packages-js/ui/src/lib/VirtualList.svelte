<script lang="ts" generics="T">
    import { onMount, tick, type Snippet } from 'svelte';

    // Props with $props()
    type Props<T> = {
        children: Snippet<[{
            key: string;
            item: T;
        }]>;
        empty: Snippet<[]>;
        items?: [string, T][];
        height?: string;
        itemHeight?: number;
        start?: number;
        end?: number;
        viewport?: HTMLDivElement;
        limit?: number;
        average_height?: number;
        min_height?: number;
    };

    let {
        children,
        empty,
        items = [],
        height = '100%',
        itemHeight,
        start = 0,
        end = 0,
        viewport,
        limit,
        average_height = 0,
        min_height = 20,
    }: Props<T> = $props();

    // Local state with $state()
    let height_map = $state<number[]>([]);
    let rows = $state<HTMLElement[]>([]);
    let contents = $state<HTMLDivElement>();
    let viewport_height = $state(0);
    let visible = $derived(items.slice(start, end + 1)
        .map((data, i) => ({ index: i + start, data }))
        .slice(0, limit));
    let mounted = $state(false);
    let reached_end = $state(false);
    let reached_start = $state(true);
    let top = $state(0);
    let bottom = $state(0);
    let first = $state(true);

    // Derived values with $derived()
    ;

    // Effects with $effect()
    $effect(() => {
        if (mounted) {
            refresh(items, viewport_height, itemHeight);
            handleUpdate();
        }
    });

    async function refresh(
        items: [string, T][],
        viewport_height: number,
        itemHeight: number | undefined,
    ) {
        if (!viewport) throw new Error('VirtualList: missing viewport');
        if (first) {
            first = false;
            // render first 3 rows
            end = Math.min(3, items.length);
            await tick();
            let avg_height = 0;
            for (let i = 0; i < end; i += 1) {
                avg_height += height_map[i] = itemHeight || rows[i]?.offsetHeight || min_height;
            }
            avg_height /= end;
            avg_height = Math.max(avg_height, min_height);
            height_map = new Array(items.length).fill(avg_height);
        }
        const { scrollTop } = viewport;

        await tick(); // wait until the DOM is up to date

        let content_height = top - scrollTop;
        let i = start;

        while (content_height <= viewport_height && i < items.length) {
            let row = rows[i - start];

            if (!row) {
                end = i + 1;
                await tick(); // render the newly visible row
                row = rows[i - start];
            }

            const row_height = row
                ? (height_map[i] = itemHeight || height_map[i] || row?.offsetHeight || min_height)
                : content_height / i;
            content_height += row_height;
            i += 1;
        }

        end = i;

        const remaining = items.length - end;
        average_height = (top + content_height) / end;
        average_height = Math.max(average_height, min_height);

        bottom = remaining * average_height;
        height_map.length = items.length;
    }

    function isHidden() {
        if (!viewport) throw new Error('VirtualList: missing viewport');
        if (viewport.offsetParent === null) return true;
        if (!viewport.offsetHeight) return true;
        const style = window.getComputedStyle(viewport);
        return (style.display === 'none');
    }

    async function handleUpdate() {
        if (!viewport) throw new Error('VirtualList: missing viewport');
        viewport_height = viewport.offsetHeight;
        if (isHidden()) return;
        const { scrollTop } = viewport;

        for (let v = 0; v < rows.length; v += 1) {
            height_map[start + v] = itemHeight || rows[v]?.offsetHeight || min_height;
        }

        let i = 0;
        let y = 0;

        while (i < items.length) {
            const row_height = height_map[i] || average_height;
            if (y + row_height > scrollTop) {
                start = i;
                top = y;
                break;
            }

            y += row_height;
            i += 1;
        }

        while (i < items.length) {
            y += height_map[i] || average_height;
            i += 1;

            if (y > scrollTop + viewport_height) break;
        }

        end = i;

        const remaining = items.length - end;
        average_height = y / end;
        average_height = Math.max(average_height, min_height);

        while (i < items.length) height_map[i++] = average_height;
        bottom = remaining * average_height;

        reached_start = scrollTop < 1;
        reached_end = scrollTop + viewport_height >= contents!.offsetHeight;
    }

    // onMount remains the same
    onMount(() => {
        rows = contents!.children as unknown as HTMLElement[];
        mounted = true;
    });
</script>

<svelte:window onresize={handleUpdate} />
<div class="viewport"
    bind:this={viewport}
    onscroll={handleUpdate}
    style:height
    class:reached-start={reached_start}
    class:reached-end={reached_end}
>
    <div
        class="contents"
        bind:this={contents}
        style:padding-top="{top}px"
        style:padding-bottom="{bottom}px"
    >
        {#each visible as row (row.data[0])}
            <div class="row">
                {@render children({
                    key: row.data[0],
                    item: row.data[1],
                })}
            </div>
        {/each}
        {#if items.length === 0}
            <div>
                {@render empty()}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .viewport {
        position: relative;
        display: block;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }

        box-shadow: inset 0 2px 0 0 #f9f9f9, inset 0 -2px 0 0 #f9f9f9;

        &.reached-start {
            box-shadow: inset 0 -2px 0 0 #f9f9f9;
        }

        &.reached-end {
            box-shadow: inset 0 2px 0 0 #f9f9f9;
        }
    }

    .contents,
    .row {
        display: block;
    }

    .row {
        overflow: hidden;
    }
</style>
