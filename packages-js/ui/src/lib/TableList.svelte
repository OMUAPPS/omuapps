<script lang="ts" generics="T extends Keyable">
    import { batchCall } from './utils/batch.js';

    import { client } from './stores.js';

    import VirtualList from './VirtualList.svelte';

    import TableListEntry from './TableListEntry.svelte';

    import type { Table } from '@omujs/omu/extension/table/table.js';
    import type { Keyable } from '@omujs/omu/interface.js';
    import {
        type ComponentType,
        type SvelteComponent,
        onDestroy,
        onMount,
        tick,
    } from 'svelte';

    export let table: Table<T>;
    export let component: ComponentType<
        SvelteComponent<{ entry: T; selected?: boolean }>
    >;
    export let filter: (key: string, entry: T) => boolean = () => true;
    export let sort: (a: T, b: T) => number = () => 0;
    export let reverse: boolean = false;
    export let initial: number = 40;
    export let limit = 400;
    export let fitHeight = false;
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
        fetchLock = table
            .fetchItems({
                limit: initial,
                cursor: last,
                before: initial,
            })
            .then((items) => {
                last = [...items.keys()].at(-1);
                updateCache(items);
                update();
                return (
                    [...items.keys()].filter((key) => key !== last).length > 0
                );
            })
            .finally(() => {
                fetchLock = undefined;
            });
        return await fetchLock;
    }

    function updateCache(cache: Map<string, T>) {
        if (cache.size === 0) return;
        let newItems = [...cache.entries()];
        if (filter) {
            newItems = newItems.filter(([key, entry]) => filter(key, entry));
        }
        if (newItems.length === 0) return;
        const prevSize = entries.size;
        entries = new Map([...entries.entries(), ...newItems]);
        if (prevSize !== entries.size) {
            updated = true;
        }
        if (startIndex === 0) {
            entries = new Map([...entries.entries()].slice(-limit));
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
            updated = true;
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
            updated = true;
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

    const unlisten = batchCall(
        $client.onReady(() => {
            entries.clear();
            fetch();
        }),
        table.listen((items) => {
            updateCache(items);
        }),
        table.event.remove.listen(onRemove),
        table.event.update.listen(onUpdate),
        table.event.add.listen(onAdd),
    );

    onDestroy(unlisten);
    onMount(() => {
        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
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

    async function handleScroll(e: Event) {
        const target = e.target as HTMLDivElement;
        let { scrollTop, scrollHeight, clientHeight } = target;
        while (scrollTop + clientHeight >= scrollHeight - 4000) {
            if (fetchLock) {
                await fetchLock;
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
    }

    function handleSelectItem(e: KeyboardEvent) {
        if (items.length === 0) return false;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!selectedItem) {
                selectedItem = items[startIndex][0];
                return true;
            }
            const index = items.findIndex(([key]) => key === selectedItem);
            if (index === -1) return true;
            if (index + 1 < items.length) {
                selectedItem = items[index + 1][0];
            }
            return true;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!selectedItem) {
                selectedItem = items[startIndex][0];
                return true;
            }
            const index = items.findIndex(([key]) => key === selectedItem);
            if (index === -1) return true;
            if (index - 1 >= 0) {
                selectedItem = items[index - 1][0];
            }
            return true;
        }
        return false;
    }

    let average_height: number = 0;

    function scrollToSelected() {
        if (!selectedItem) return;
        let index = items.findIndex(([key]) => key === selectedItem);
        if (index === -1) return;
        if (index < startIndex + 1) {
            index = Math.max(0, index - 1);
            const row = index * average_height;
            viewport.scrollTo({ top: row, behavior: 'instant' });
            return;
        }
        if (index > endIndex - 3) {
            index = startIndex + 2;
            const row = index * average_height;
            viewport.scrollTo({ top: row, behavior: 'instant' });
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (handleSelectItem(e)) {
            scrollToSelected();
        }
    }

    function selectItem(key: string | undefined) {
        selectedItem = key;
    }
</script>

<svelte:window on:keydown={handleKeydown} />
<div class="list" class:full={!fitHeight}>
    <div class="items">
        <VirtualList
            {items}
            bind:average_height
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
            <i class="ti ti-chevron-up" />
        </button>
    {/if}
    <button class="loading" class:active={fetchLock !== undefined}>
        <i class="ti ti-loader-2" />
    </button>
</div>

<style lang="scss">
    .list {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .full {
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
