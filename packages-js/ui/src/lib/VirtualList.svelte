<!-- Modified version of https://github.com/sveltejs/svelte-virtual-list -->

<script lang="ts" generics="T">
    import { onMount, tick } from 'svelte';

    // props
    export let items: [string, T][] = [];

    export let height = '100%';
    export let itemHeight: number | undefined = undefined;

    // read-only, but visible to consumers via bind:start
    export let start = 0;
    export let end = 0;
    export let viewport: HTMLDivElement;

    // local state
    let height_map: number[] = [];
    let rows: HTMLElement[];
    let contents: HTMLDivElement;
    let viewport_height = 0;
    let visible: { index: number; data: [string, T] }[];
    let mounted: boolean;

    let top = 0;
    let bottom = 0;
    export let average_height: number = 0;
    let first = true;

    // whenever `items` changes, invalidate the current heightmap
    $: if (mounted) {
        refresh(items, viewport_height, itemHeight);
        handleUpdate();
    }

    $: visible = items.slice(start, end + 1).map((data, i) => {
        return { index: i + start, data };
    });

    async function refresh(
        items: [string, T][],
        viewport_height: number,
        itemHeight: number | undefined,
    ) {
        if (first) {
            first = false;
            // render first 3 rows
            end = Math.min(3, items.length);
            await tick();
            let average_height = 0;
            for (let i = 0; i < end; i += 1) {
                average_height += height_map[i] = itemHeight || rows[i].offsetHeight;
            }
            average_height /= end;
            height_map = new Array(items.length).fill(average_height);
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
                ? (height_map[i] = itemHeight || height_map[i] || row.offsetHeight)
                : content_height / i;
            content_height += row_height;
            i += 1;
        }

        end = i;

        const remaining = items.length - end;
        average_height = (top + content_height) / end;

        bottom = remaining * average_height;
        height_map.length = items.length;
    }

    function isHidden() {
        return viewport.offsetParent === null;
    }

    async function handleUpdate() {
        if (isHidden()) return;
        const { scrollTop } = viewport;

        for (let v = 0; v < rows.length; v += 1) {
            height_map[start + v] = itemHeight || rows[v].offsetHeight;
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

        while (i < items.length) height_map[i++] = average_height;
        bottom = remaining * average_height;
    }

    // trigger initial refresh
    onMount(() => {
        rows = contents.getElementsByTagName('svelte-virtual-list-row') as unknown as HTMLElement[];
        mounted = true;
    });
</script>

<svelte-virtual-list-viewport
    bind:this={viewport}
    bind:offsetHeight={viewport_height}
    on:scroll={handleUpdate}
    on:resize={handleUpdate}
    style:height
>
    <svelte-virtual-list-contents
        bind:this={contents}
        style:padding-top="{top}px"
        style:padding-bottom="{bottom}px"
    >
        {#each visible as row (row.data[0])}
            <svelte-virtual-list-row>
                <slot key={row.data[0]} item={row.data[1]}>Missing template</slot>
            </svelte-virtual-list-row>
        {/each}
    </svelte-virtual-list-contents>
</svelte-virtual-list-viewport>

<style lang="scss">
    svelte-virtual-list-viewport {
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

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
    }

    svelte-virtual-list-contents,
    svelte-virtual-list-row {
        display: block;
    }

    svelte-virtual-list-row {
        overflow: hidden;
    }
</style>
