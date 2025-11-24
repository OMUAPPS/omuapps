<script lang="ts">
    export let value: any;
    export let open = false;
</script>

{#if typeof value === 'undefined'}
    <span class="undefined">undefined</span>
{:else if value === null}
    <span class="null">null</span>
{:else if typeof value === 'string'}
    <span class="string">"{value}"</span>
{:else if typeof value === 'number'}
    <span class="number">{value}</span>
{:else if typeof value === 'boolean'}
    <span class="boolean">{value ? 'true' : 'false'}</span>
{:else if value instanceof Uint8Array}
    <strong>Uint8Array({value.length})</strong>
{:else if Array.isArray(value)}
    <strong>[</strong>
    <button on:click={() => open = !open}>
        {#if open}
            <i class="ti ti-chevron-up"></i>
        {:else}
            <i class="ti ti-dots"></i>
        {/if}
    </button>
    <ul>
        {#each value as item, i (i)}
            <li>
                <svelte:self value={item} />
            </li>
        {/each}
    </ul>
    <strong>]</strong>
{:else if typeof value === 'object'}
    <strong>{'{'}</strong>
    <button on:click={() => open = !open}>
        {#if open}
            <i class="ti ti-chevron-up"></i>
        {:else}
            <i class="ti ti-dots"></i>
        {/if}
    </button>
    {#if open}
        <ul>
            {#each Object.entries(value) as [key, val] (key)}
                <li>
                    <strong>{key}:</strong>
                    <svelte:self value={val} />
                </li>
            {/each}
        </ul>
    {/if}
    <strong>}</strong>
{:else}
    <span>{value}</span>
{/if}

<style lang="scss">
    ul {
        list-style: none;
        padding-left: 1rem;
    }

    li {
        margin-bottom: 0.5rem;
    }

    strong {
        font-weight: bold;
    }

    span {
        font-style: italic;
    }

    .undefined,
    .null,
    .string,
    .number,
    .boolean {
        color: var(--color-1);
        white-space: wrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 10rem;
    }
</style>
