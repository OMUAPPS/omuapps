<script lang="ts">
    import type { Value } from '../../game/script.js';

    export let value: Value;
</script>

{#if value.type === 'string'}
    <span>"</span>
    {value.value}
    <span>"</span>
{:else if value.type === 'array'}
    <span>[</span>
    {#each value.items as item, i (i)}
        {#if i > 0}
            <span>,</span>
        {/if}
        <svelte:self value={item} />
    {/each}
    <span>]</span>
{:else if value.type === 'void'}
    <span>void</span>
{:else}
    {`Unknown value type: ${value.type}`}
{/if}

<style>
    span {
        opacity: 0.5;
    }
</style>
