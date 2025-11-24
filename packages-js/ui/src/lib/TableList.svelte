<script lang="ts" generics="T">

    import type { Table } from '@omujs/omu/api/table';
    import { type Snippet } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import { omu } from './stores';
    import VirtualList from './VirtualList.svelte';

    interface Props<T> {
        table: Table<T>;
        component: Snippet<[{ entry: T; selected?: boolean }]>;
        filter?: (key: string, entry: T) => boolean;
        sort?: ((a: T) => number) | undefined;
        reverse?: boolean;
        chunkSize?: number;
        selectedItem?: string | undefined;
        empty?: import('svelte').Snippet;
    }

    let {
        table,
        component,
        filter = () => true,
        sort = undefined,
        chunkSize = 40,
        selectedItem = $bindable(undefined),
        empty,
    }: Props<T> = $props();

    let items = new SvelteMap<string, T>();

    function updateItems(newItems: Map<string, T>) {
        for (const [key, entry] of newItems.entries()) {
            items.set(key, entry);
        }
    }

    let lock: Promise<void> | undefined;
    let lastScroll = {
        time: 0,
        y: 0,
    };

    async function fetch() {
        if (lock) await lock;
        const scrollTop = viewport?.scrollTop ?? 0;
        const deltaY = scrollTop - lastScroll.y;
        const deltaTime = (performance.now() - lastScroll.time) / 1000;
        const itemsInSeconds = (deltaY / deltaTime) / Math.max(1, averageHeight);
        lock = table.fetchItems({
            limit: Math.max(chunkSize, Math.pow(itemsInSeconds, 0.98) + Math.log(itemsInSeconds)),
            backward: true,
            cursor: [...items.keys()][items.size - 1],
        }).then((newItems) => {
            updateItems(newItems);
            lastScroll.time = performance.now();
            lastScroll.y = scrollTop;
        });
    }

    async function onreached(args: { top: boolean; bottom: boolean }) {
        if (args.bottom) {
            await fetch();
        }
    }

    let viewport: HTMLElement | undefined = $state(undefined);
    let averageHeight: number = $state(0);

    $omu.onReady(() => {
        fetch();
    });
    table.listen((items) => {
        updateItems(items);
    });
    table.event.remove.listen((removedItems) => {
        for (const key of removedItems.keys()) {
            items.delete(key);
        }
    });

    let filtered = $derived.by(() => {
        let entries = Array.from(items.entries());
        if (filter) {
            entries = entries.filter(([key, item]) => filter(key, item));
        }
        if (sort) {
            entries = entries.sort(([, entryA], [, entryB]) => sort(entryA) - sort(entryB));
        }
        entries = entries.reverse();
        return entries;
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
