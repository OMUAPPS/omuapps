<script lang="ts">
    import JsonEditEntry from './JsonEditEntry.svelte';

    interface Props {
        value: any;
    }

    let { value = $bindable() }: Props = $props();
</script>

<pre>
    <JsonEditEntry bind:value={value} open />
</pre>

<style>
    pre {
        overflow-x: auto;
        width: 20rem;
    }
</style>
