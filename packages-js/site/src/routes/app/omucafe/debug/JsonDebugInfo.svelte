<script lang="ts">
    import JsonDebugInfoEntry from './JsonDebugInfoEntry.svelte';

    export let value: any;
</script>

<pre>
    <JsonDebugInfoEntry value={value} open/>
</pre>

<style>
    pre {
        background: var(--color-bg-2);
        padding: 0.5rem 0;
        overflow-x: auto;
        width: 20rem;
    }
</style>
