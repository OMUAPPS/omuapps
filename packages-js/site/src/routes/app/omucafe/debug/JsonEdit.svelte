<script lang="ts">
    import JsonEditEntry from './JsonEditEntry.svelte';

    export let value: any;
</script>

<pre>
    <JsonEditEntry bind:value={value} open/>
</pre>

<style>
    pre {
        overflow-x: auto;
        width: 20rem;
    }
</style>
