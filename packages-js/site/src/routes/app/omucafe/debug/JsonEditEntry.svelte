<script lang="ts">

    export let value: any;
    export let open = false;
</script>

{#if typeof value === 'undefined'}
    <span class="undefined">undefined</span>
{:else if value === null}
    <span class="null">null</span>
{:else if typeof value === 'string'}
    <span class="string">
        <input type="text" bind:value={value} />
    </span>
{:else if typeof value === 'number'}
    <span class="number">
        <input type="text" value={value.toString()} on:input={({ currentTarget }) => {
            const newValue = parseFloat(currentTarget.value);
            if (Number.isNaN(newValue) || Number.isFinite(newValue)) return;
            value = newValue;
            console.log(value);
        }} />
    </span>
{:else if typeof value === 'boolean'}
    <span class="boolean">{value ? 'true' : 'false'}</span>
{:else if value instanceof Uint8Array}
    <strong>Uint8Array({value.length})</strong>
{:else if Array.isArray(value)}
    <strong>[</strong>
    <button onclick={() => open = !open}>
        {#if open}
            <i class="ti ti-chevron-up"></i>
        {:else}
            <i class="ti ti-dots"></i>
        {/if}
    </button>
    <ul>
        {#each value as _, i (i)}
            <li>
                <svelte:self bind:value={value[i]} />
            </li>
        {/each}
    </ul>
    <strong>]</strong>
{:else if typeof value === 'object'}
    <strong>{'{'}</strong>
    <button onclick={() => open = !open}>
        {#if open}
            <i class="ti ti-chevron-up"></i>
        {:else}
            <i class="ti ti-dots"></i>
        {/if}
    </button>
    {#if open}
        <ul>
            {#each Object.keys(value) as key (key)}
                <li>
                    <strong>{key}:</strong>
                    <svelte:self bind:value={value[key]} />
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
