<script lang="ts">
    import { getContext } from 'svelte';
    import type { Value } from '../../game/script.js';
    import { SCRIPT_EDITOR_CONTEXT, type ScriptEditorContext } from './scripteditor.js';

    export let value: Value;
    let active = false;

    const ctx = getContext<ScriptEditorContext>(SCRIPT_EDITOR_CONTEXT);
</script>

<button on:click={(event) => {
    ctx.editValue({
        value,
        setter: (val) => {
            value = val;
        },
        cancel() {
            active = false;
        },
    });
    active = true;
    event.stopPropagation();
}} class:active>
    {#if value.type === 'variable'}
        <i class="ti ti-variable"></i>
        {value.name}
    {:else if value.type === 'string'}
        <i class="ti ti-text-size"></i>
        {value.value}
    {:else if value.type === 'invoke'}
        <i class="ti ti-caret-right-filled"></i>
        <svelte:self bind:value={value.function} />
        <i class="ti ti-brackets-contain-start"></i>
        {#each value.args as arg, index (index)}
            <svelte:self bind:value={arg} />
        {/each}
        <i class="ti ti-brackets-contain-end"></i>
    {:else if value.type === 'void'}
        <i class="ti ti-question-mark"></i>
    {:else}
        Unknown Value Type {value.type}
    {/if}
</button>

<style lang="scss">
    i {
        font-size: 1rem;
    }
    
    button {
        background: rgb(58, 180, 119);
        color: #fff;
        border: none;
        border: 1px solid rgb(33, 104, 68);
        border-radius: 6px;
        padding: 0.3rem 0.5rem;
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        border-radius: 999px;
        padding: 0.3rem 0.5rem;
    }

    button:hover {
        outline: 2px solid #fff;
    }

    .active {
        background: #fff;
        color: var(--color-1);
    }
</style>
