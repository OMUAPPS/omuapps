<script lang="ts" generics="T">

    import type { Table } from '@omujs/omu/api/table';
    import { onMount, type Snippet } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import VirtualList from './VirtualList.svelte';

    interface Props<T> {
        table: Table<T>;
        component: Snippet<[{ entry: T; selected?: boolean }]>;
        filter?: (key: string, entry: T) => boolean;
        sort?: ((a: T) => number) | undefined;
        reverse?: boolean;
        chunkSize?: number;
        empty?: import('svelte').Snippet;
    }

    let {
        table,
        component,
        filter = () => true,
        sort = undefined,
        reverse = false,
        chunkSize = 40,
        empty,
    }: Props<T> = $props();

    let items = new SvelteMap<string, T>();

    function updateItems(newItems: Map<string, T>) {
        for (const [key, entry] of newItems.entries()) {
            items.set(key, entry);
        }
    }

    let loading = $state(false);
    let hasMore = $state(true);
    let fetchedKeys: string[] = [];
    let lastScroll = {
        time: 0,
        y: 0,
    };

    async function fetch() {
        if (loading || !hasMore) return;
        loading = true;
        const scrollTop = viewport?.scrollTop ?? 0;
        const deltaY = scrollTop - lastScroll.y;
        const deltaTime = (performance.now() - lastScroll.time) / 1000;
        const itemsInSeconds = Math.max(0, (deltaY / deltaTime) / Math.max(1, averageHeight));
        const dynamicLimit = itemsInSeconds > 0
            ? Math.pow(itemsInSeconds, 0.98) + Math.log(itemsInSeconds)
            : 0;
        const limit = Math.ceil(Math.max(chunkSize, dynamicLimit));
        const cursor = fetchedKeys.at(-1);
        try {
            const newItems = await table.fetchItems({
                limit,
                backward: true,
                cursor,
            });
            updateItems(newItems);
            const newKeys = [...newItems.keys()];
            fetchedKeys.push(...newKeys);
            hasMore = newItems.size >= limit && newKeys.at(-1) !== cursor;
            lastScroll.time = performance.now();
            lastScroll.y = scrollTop;
        } finally {
            loading = false;
        }
    }

    async function onreached(args: { top: boolean; bottom: boolean }) {
        if (args.bottom) {
            await fetch();
        }
    }

    let viewport: HTMLElement | undefined = $state(undefined);
    let averageHeight: number = $state(0);

    onMount(() => {
        fetch();
    });

    $effect(() => {
        const unlistenCache = table.listen(updateItems);
        const unlistenRemove = table.on('remove', (removedItems) => {
            for (const key of removedItems.keys()) {
                items.delete(key);
            }
            const removedKeys = new Set(removedItems.keys());
            fetchedKeys = fetchedKeys.filter((key) => !removedKeys.has(key));
        });
        return () => {
            unlistenCache();
            unlistenRemove();
        };
    });

    let filtered = $derived.by(() => {
        let entries = Array.from(items.entries());
        if (filter) {
            entries = entries.filter(([key, item]) => filter(key, item));
        }
        if (sort) {
            entries = entries.sort(([, entryA], [, entryB]) => sort(entryA) - sort(entryB));
        }
        if (reverse) {
            entries = entries.reverse();
        }
        return entries;
    });

    $effect(() => {
        if (items.size > 0 && filtered.length === 0 && hasMore && !loading) {
            const frame = requestAnimationFrame(() => {
                void fetch();
            });
            return () => cancelAnimationFrame(frame);
        }
    });

    let selected: string | undefined = $state(undefined);
</script>

<div class="list">
    <div class="items">
        {#if filtered.length > 0}
            <VirtualList items={filtered} {onreached} bind:viewport bind:averageHeight>
                {#snippet render([id, entry])}
                    <div class="item" onmouseenter={() => {
                        selected = id;
                    }} onmouseleave={() => {
                        if (selected === id) {
                            selected = undefined;
                        }
                    }} role="article">
                        {@render component?.({
                            entry,
                            selected: selected === id,
                        })}
                    </div>
                {/snippet}
            </VirtualList>
        {:else}
            {@render empty?.()}
        {/if}
    </div>
</div>

<style lang="scss">
    .list {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
    }

    .items {
        position: absolute;
        inset: 0;
    }
</style>
