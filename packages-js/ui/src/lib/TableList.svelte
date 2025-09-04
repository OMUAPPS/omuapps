<script lang="ts" generics="T">
    import { client } from "./stores.js";

    import VirtualList from "./VirtualList.svelte";

    import TableListEntry from "./TableListEntry.svelte";

    import type { Table } from "@omujs/omu/api/table";
    import {
        type ComponentType,
        type SvelteComponent,
        onDestroy,
        onMount,
        tick,
    } from "svelte";

    export let table: Table<T>;
    export let component: ComponentType<
        SvelteComponent<{ entry: T; selected?: boolean }>
    >;
    export let filter: (key: string, entry: T) => boolean = () => true;
    export let sort: ((a: T, b: T) => number) | undefined = undefined;
    export let reverse: boolean = false;
    export let backward: boolean = true;
    export let initial: number = 40;

    export let limit = 400;
    export let selectedItem: string | undefined = undefined;

    let entries: Map<string, T> = new Map();
    let items: Array<[string, T]> = [];
    let addedItems: string[] = [];
    let animationTimeout: number | undefined;
    let startIndex = 0;
    let endIndex = 0;
    let updated = false;
    let viewport: HTMLDivElement;
    let last: string | undefined;
    let fetchLock: Promise<boolean> | undefined;

    async function fetch(): Promise<boolean> {
        if (fetchLock) {
            await fetchLock;
        }
        let cursor: string | undefined = last;
        while (cursor && !(await table.has(cursor))) {
            if (entries.size === 0) {
                cursor = undefined;
                break;
            }
            cursor = [...entries.keys()].at(backward ? 0 : -1);
        }
        fetchLock = table
            .fetchItems({
                limit: initial,
                backward,
                cursor,
            })
            .then((items) => {
                last = [...items.keys()].at(backward ? -1 : -1);
                updateCache(items);
                update();
                return (
                    [...items.keys()].filter((key) => !entries.has(key))
                        .length > 0
                );
            })
            .finally(() => {
                fetchLock = undefined;
            });
        return await fetchLock;
    }

    function updateCache(cache: Map<string, T>) {
        if (cache.size === 0) return;
        let changed = false;
        const newItems: [string, T][] = [];
        for (const [key, value] of cache.entries()) {
            if (filter && !filter(key, value)) {
                continue;
            }
            if (entries.has(key)) {
                entries.set(key, value);
            } else {
                newItems.push([key, value]);
                changed = true;
            }
        }
        if (changed) {
            let newEntries = [...newItems, ...entries.entries()];
            if (sort) {
                newEntries = newEntries.sort(
                    ([, entryA], [, entryB]) => sort(entryA, entryB) || 0,
                );
            }
            entries = new Map(newEntries);
            updated = true;
        }
    }

    function onRemove(items: Map<string, T>) {
        const keys = items.keys();
        let changed = false;
        for (const key of keys) {
            if (entries.delete(key)) {
                changed = true;
            }
        }
        if (changed) {
            update();
        }
    }

    function onUpdate(items: Map<string, T>) {
        let changed = false;
        for (const [key, value] of items.entries()) {
            if (filter && !filter(key, value)) {
                if (entries.delete(key)) {
                    changed = true;
                }
                continue;
            }
            entries.set(key, value);
            changed = true;
        }
        if (changed) {
            update();
        }
    }
    function onAdd(items: Map<string, T>) {
        addedItems = [...items.keys()];
        if (animationTimeout) {
            window.clearTimeout(animationTimeout);
        }
        animationTimeout = window.setTimeout(() => {
            addedItems = [];
        }, 200);
    }

    const unlisten = [
        $client.onReady(() => {
            entries.clear();
            last = undefined;
            fetch();
        }),
        $client.network.event.disconnected.listen(() => {
            entries.clear();
            last = undefined;
        }),
        table.listen((items) => {
            updateCache(items);
        }),
        table.event.remove.listen(onRemove),
        table.event.update.listen(onUpdate),
        table.event.add.listen(onAdd),
    ];

    onDestroy(() => {
        unlisten.forEach((unlisten) => unlisten());
    });
    onMount(() => {
        viewport.addEventListener("scroll", handleScroll);
        return () => viewport.removeEventListener("scroll", handleScroll);
    });

    function scrollToTop() {
        viewport.scrollTo({ top: 0 });
    }

    function update(
        filter?: (key: string, entry: T) => boolean,
        sort?: (a: T, b: T) => number,
        reverse?: boolean,
    ) {
        items = Array.from(entries.entries());
        if (filter) {
            items = items.filter(([key, entry]) => filter(key, entry));
        }
        if (sort) {
            items = items.sort(([, entryA], [, entryB]) =>
                sort(entryA, entryB),
            );
        }
        if (reverse) {
            items = items.reverse();
        }
        updated = false;
    }

    $: {
        if (!items.length || (startIndex === 0 && updated)) {
            update(filter, sort, reverse);
        }
    }

    $: {
        update(filter, sort, reverse);
    }

    let scrollLock: Promise<void> | undefined;

    async function handleScroll(e: Event) {
        if (scrollLock) return;
        scrollLock = (async () => {
            const target = e.target as HTMLDivElement;
            let { scrollTop, scrollHeight, clientHeight } = target;
            while (scrollTop + clientHeight >= scrollHeight - 4000) {
                if (fetchLock) {
                    await fetchLock;
                    fetchLock = undefined;
                    await tick();
                    scrollTop = target.scrollTop;
                    scrollHeight = target.scrollHeight;
                    clientHeight = target.clientHeight;
                    continue;
                }
                const result = await fetch();
                if (!result) break;
                await tick();
                scrollTop = target.scrollTop;
                scrollHeight = target.scrollHeight;
                clientHeight = target.clientHeight;
            }
        })().finally(() => {
            scrollLock = undefined;
        });
    }

    function selectItem(key: string | undefined) {
        selectedItem = key;
    }
</script>

<svelte:window />
<div class="list">
    <div class="items">
        <VirtualList
            {items}
            limit={initial}
            bind:viewport
            bind:start={startIndex}
            bind:end={endIndex}
            let:key
            let:item
        >
            <TableListEntry
                {key}
                {selectItem}
                transition={startIndex === 0 && addedItems.includes(key)}
            >
                <svelte:component
                    this={component}
                    entry={item}
                    selected={key === selectedItem}
                />
            </TableListEntry>
            <slot slot="empty" name="empty" />
        </VirtualList>
    </div>
    {#if updated}
        <button class="update" on:click={scrollToTop}>
            更新があります
            <i class="ti ti-chevron-up"></i>
        </button>
    {/if}
    <button
        class="loading"
        class:active={fetchLock !== undefined}
        aria-label="loading"
    >
        <i class="ti ti-loader-2"></i>
    </button>
</div>

<style lang="scss">
    .list {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .loading {
        position: absolute;
        right: 50%;
        bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        font-size: 20px;
        color: var(--color-1);
        visibility: hidden;
        background: transparent;
        border: none;
        transform: translateX(50%);
        animation: spin 1s linear infinite;

        &.active {
            visibility: visible;
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    .update {
        position: absolute;
        top: 10px;
        right: 50%;
        display: flex;
        gap: 5px;
        align-items: baseline;
        justify-content: center;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-bg-1);
        text-wrap: nowrap;
        background: var(--color-1);
        border: none;
        border-radius: 50px;
        outline: none;
        transform: translateX(50%);

        i {
            font-size: 14px;
        }

        &:hover {
            outline: 2px solid var(--color-bg-1);
            outline-offset: -4px;
        }
    }

    .items {
        position: absolute;
        inset: 0;
    }
</style>
