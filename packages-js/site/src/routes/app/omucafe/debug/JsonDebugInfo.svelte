<script lang="ts">
    import JsonDebugInfoEntry from './JsonDebugInfoEntry.svelte';

    interface Props {
        value: any;
    }

    let { value }: Props = $props();
</script>

<pre>
    <JsonDebugInfoEntry value={value} open />
</pre>

<style>
    pre {
        background: var(--color-bg-2);
        padding: 0.5rem 0;
        overflow-x: auto;
        width: 20rem;
    }
</style>
