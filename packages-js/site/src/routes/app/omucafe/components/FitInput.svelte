<script lang="ts">
    export let value: string;

    let bounds: HTMLElement;
    let element: HTMLElement;
    let width = 0;

    function update(_: string) {
        if (!element) return;
        width = element.getBoundingClientRect().width;
    }

    $: setTimeout(() => {
        update(value);
    });
</script>

<span bind:this={element}>{value}</span>
<label>
    <input type="text" style:width="{width}px" bind:value={value}>
    {#if !value}
        <i class="ti ti-pencil"></i>
    {/if}
</label>

<style lang="scss">
    span {
        position: absolute;
        pointer-events: none;
        visibility: hidden;
    }
    
    input {
        border: none;
        background: none;
        font-family: inherit;
        font-weight: inherit;
        color: inherit;
    }

    input:focus {
        min-width: 4rem;
    }
</style>
