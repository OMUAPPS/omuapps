<script lang="ts">
    import VirtualList from './VirtualList.svelte';

    export let length: number = 1000;

    const items = Array.from({ length }, (_, i) => [`Item ${i}`, `Item ${i}`] as [string, string]);

    let viewport: HTMLDivElement;
</script>

<div>
    <VirtualList {viewport} {items} let:item>
        <li>{item}</li>
    </VirtualList>
</div>

<style>
    div {
        height: 400px;
    }
</style>
