<script lang="ts">
    import { Combobox } from '@omujs/ui';
    import EditValue from './EditValue.svelte';
    import { builder, command, value, type Expression } from './script.js';

    export let expression: Expression;
</script>

<div class="commands">
    {#each expression.commands as command, index (index)}
        <div class="item">
            <button on:click={() => {
                expression.commands = expression.commands.filter((_, idx) => idx !== index);
            }} class="delete">
                <i class="ti ti-x"></i>
            </button>
            {#if command.type === 'invoke'}
                <div class="invoke">
                    <i class="ti ti-caret-right-filled"></i>
                    <EditValue bind:value={command.function} />
                    <i class="ti ti-brackets-contain-start"></i>
                    {#each command.args as arg, index (index)}
                        <EditValue bind:value={arg} />
                    {/each}
                    <button on:click={() => {
                        command.args = [
                            ...command.args,
                            builder.v.void(),
                        ];
                    }}>
                        <i class="ti ti-plus"></i>
                    </button>
                    <i class="ti ti-brackets-contain-end"></i>
                </div>
            {:else if command.type === 'assign'}
                <div class="assign">
                    <i class="ti ti-package-import"></i>
                    <EditValue bind:value={command.variable} />
                    <i class="ti ti-equal"></i>
                    <EditValue bind:value={command.value} />
                </div>
            {:else}
                Unknown Command Type {command.type}
            {/if}
        </div>
    {/each}
    <Combobox options={{
        add: {
            label: 'add',
            value: null,
        },
        assign: {
            label: 'Assign',
            value: () => command.assign(value.void(), value.void()),
        },
        invoke: {
            label: 'Invoke',
            value: () => command.invoke(value.void(), value.void()),
        },
    }} value={null} on:change={({ detail: { value } }) => {
        if (!value) return;
        expression.commands = [
            ...expression.commands,
            value(),
        ];
    }} />
</div>

<style lang="scss">
    .commands {
        display: flex;
        flex-direction: column;
        padding: 1rem 0.25rem;
        gap: 0.5rem;
    }

    i {
        font-size: 1rem;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .delete {
        width: 2.4rem;
        height: 100%;
        padding: 0.74rem 0;
        border: none;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        border-right: 2px solid var(--color-1);
        background: none;
        color: var(--color-1);
    }

    .invoke {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        background: rgb(255, 174, 0);
        border: 1px solid rgb(199, 137, 3);
        color: #fff;
        border-radius: 3px;
        padding: 0.3rem 0.5rem;
    }

    .assign {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        background: rgb(47, 175, 226);
        border: 1px solid rgb(25, 146, 194);
        color: #fff;
        padding: 0.3rem 0.5rem;
        border-radius: 3px;
    }
</style>
