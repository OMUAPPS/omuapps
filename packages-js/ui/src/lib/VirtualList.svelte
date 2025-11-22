<script lang="ts" generics="T">

    import {
        tick,
        type Snippet,
    } from 'svelte';

    interface Props<T> {
        items: [string, T][];
        render: Snippet<[[string, T]]>;
        start?: number;
        end?: number;
        averageHeight?: number;
        onreached?: (args: { top: boolean; bottom: boolean }) => unknown;
        viewport?: HTMLElement;
    }

    let {
        items,
        render,
        start = $bindable(0),
        end = $bindable(0),
        averageHeight = $bindable(20),
        onreached = () => {},
        viewport = $bindable(),
    }: Props<T> = $props();

    let contents: HTMLElement | undefined = $state(undefined);
    let rows: HTMLElement[] = [];
    let first = $state(true);
    let heightMap: number[] = [];
    let minHeight: number = 20;
    let top = $state(0);
    let bottom = $state(0);

    async function refresh(
        items: [string, T][],
        viewportHeight: number,
    ) {
        if (!viewport) throw new Error('VirtualList: missing viewport');
        let newEnd = end;
        if (!items.length) {
            first = true;
            return;
        }
        if (first) {
            first = false;
            // render first 3 rows
            newEnd = Math.min(3, items.length);
            await tick();
            let averageHeight = 0;
            for (let i = 0; i < newEnd; i += 1) {
                averageHeight += heightMap[i] = rows[i]?.offsetHeight || minHeight;
            }
            averageHeight /= newEnd;
            averageHeight = Math.max(averageHeight, minHeight);
            heightMap = new Array(items.length).fill(averageHeight);
        }
        const { scrollTop } = viewport;

        await tick(); // wait until the DOM is up to date

        let content_height = top - scrollTop;
        let i = start;

        while (content_height <= viewportHeight && i < items.length) {
            let row = rows[i - start];

            if (!row) {
                newEnd = i + 1;
                await tick(); // render the newly visible row
                row = rows[i - start];
            }

            const row_height = row
                ? (heightMap[i] = heightMap[i] || row?.offsetHeight || minHeight)
                : content_height / i;
            content_height += row_height;
            i += 1;
        }

        newEnd = i;

        const remaining = items.length - newEnd;
        averageHeight = (top + content_height) / newEnd;
        averageHeight = Math.max(averageHeight, minHeight);

        bottom = remaining * averageHeight;
        heightMap.length = items.length;

        const visible = viewport.checkVisibility();
        if (visible) {
            end = newEnd;
        }
    }

    async function handleUpdate() {
        if (!viewport) throw new Error('VirtualList: missing viewport');
        const viewport_height = viewport.offsetHeight;
        const { scrollTop } = viewport;

        for (let v = 0; v < rows.length; v += 1) {
            heightMap[start + v] = rows[v]?.offsetHeight || minHeight;
        }

        let i = 0;
        let y = 0;

        while (i < items.length) {
            const row_height = heightMap[i] || averageHeight;
            if (y + row_height > scrollTop) {
                start = i;
                top = y;

                break;
            }

            y += row_height;
            i += 1;
        }

        while (i < items.length) {
            y += heightMap[i] || averageHeight;
            i += 1;

            if (y > scrollTop + viewport_height) break;
        }

        end = i;

        const remaining = items.length - end;
        averageHeight = y / end;
        averageHeight = Math.max(averageHeight, minHeight);

        while (i < items.length) heightMap[i++] = averageHeight;
        bottom = remaining * averageHeight;

        const reached_top = scrollTop < 1;
        const reached_bototm = scrollTop + viewport_height >= contents!.offsetHeight;
        if (reached_top || reached_bototm) {
            onreached({
                top: reached_top,
                bottom: reached_bototm,
            });
        }
    }

    $effect(() => {
        rows = contents!.children as unknown as HTMLElement[];
        refresh(items, viewport!.clientHeight);
    });

    let visible = $derived(items.slice(start, end + 1).map((data, i) => {
        return { index: i + start, data };
    }));
</script>

<div class="viewport omu-scroll" bind:this={viewport} onscroll={() => handleUpdate()}>
    <div
        class="contents"
        bind:this={contents}
        style:padding-top="{top}px"
        style:padding-bottom="{bottom}px"
    >

        {#each visible as { data } (data[0])}
            <div class="entry">
                {@render render(data)}
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .viewport {
        position: relative;
        height: 100%;
        overflow-x: hidden;
    }
</style>
