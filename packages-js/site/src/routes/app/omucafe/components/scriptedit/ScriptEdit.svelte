<script lang="ts">
    import { Button } from '@omujs/ui';
    import { setContext } from 'svelte';
    import { executeExpression, value, type Script } from '../../game/script.js';
    import { getGame } from '../../omucafe-app.js';
    import DebugLogs from '../debug/DebugLogs.svelte';
    import EditExpression from './EditExpression.svelte';
    import EditValue from './EditValue.svelte';
    import FitInput from './FitInput.svelte';
    import { SCRIPT_EDITOR_CONTEXT, type ScriptEditorContext, type ValueEdit } from './scripteditor.js';

    export let script: Script;
    const { globals } = getGame();

    let edit: ValueEdit | null = null;

    setContext(SCRIPT_EDITOR_CONTEXT, {
        editValue(newEdit) {
            if (edit) {
                edit.cancel();
            }
            edit = newEdit;
        },
    } satisfies ScriptEditorContext)

    $: if (edit) {
        edit.setter(edit.value);
    }
</script>

<div class="editor">
    <div class="tab">
        <div class="info">
            <h1>
                <FitInput bind:value={script.name} />
                <Button primary onclick={() => {
                    const ctx = globals.newContext();
                    executeExpression(ctx, script.expression);
                }}>
                    <i class="ti ti-caret-right-filled"></i>
                </Button>
            </h1>
            <small>
                {script.id}
            </small>
        </div>
        {#if edit}
            <div class="edit">
                <div class="types">
                    <button on:click={() => {
                        if (!edit) return;
                        edit.value = value.variable('');
                    }}>
                        <i class="ti ti-variable"></i>
                        variable
                    </button>
                    <button on:click={() => {
                        if (!edit) return;
                        edit.value = value.string('');
                    }}>
                        <i class="ti ti-text-size"></i>
                        string
                    </button>
                    <button on:click={() => {
                        if (!edit) return;
                        edit.value = value.invoke(value.void(), []);
                    }}>
                        <i class="ti ti-caret-right-filled"></i>    
                        invoke
                    </button>
                    <button on:click={() => {
                        if (!edit) return;
                        edit.value = value.void();
                    }}>
                        <i class="ti ti-question-mark"></i>
                        void
                    </button>
                </div>
                {#if edit.value.type === 'string'}
                    <div class="property">
                        <span>value</span>
                        <input type="text" bind:value={edit.value.value}>
                    </div>
                {:else if edit.value.type === 'variable'}
                    <div class="property">
                        <span>variable</span>
                        <input type="text" bind:value={edit.value.name}>
                    </div>
                {:else if edit.value.type === 'invoke'}
                    <div class="property">
                        <span>args</span>
                        <ul class="args">
                            {#each edit.value.args as arg, index (index)}
                                <li>
                                    <button on:click={() => {
                                        if (!edit || edit.value.type !== 'invoke') return;
                                        edit.value.args = edit.value.args.filter((_,idx) => idx !== index);
                                    }}>
                                        <i class="ti ti-x"></i>
                                    </button>
                                    <EditValue bind:value={arg} />
                                </li>
                            {/each}
                            <li>
                                <button on:click={() => {
                                    if (!edit || edit.value.type !== 'invoke') return;
                                    edit.value.args = [
                                        ...edit.value.args,
                                        value.void(),
                                    ];
                                }}>
                                    <i class="ti ti-plus"></i>
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div class="property">
                        {#each Object.entries(globals.functions) as [key, func] (key)}
                            {key}
                        {/each}
                    </div>
                {:else}
                    {edit.value.type}
                {/if}
            </div>
        {/if}
        <div class="logs">
            <DebugLogs />
        </div>
    </div>
    <div class="code">
        <EditExpression bind:expression={script.expression} />
    </div>
</div>

<style lang="scss">
    .editor {
        position: absolute;
        inset: 0;
        display: flex;
    }

    .tab {
        display: flex;
        align-items: stretch;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 8rem;
        padding-left: 2rem;
        width: 24rem;
        gap: 1rem;
        overflow-x: hidden;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .info {
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 2rem;
        padding-bottom: 1rem;
    }

    h1 {
        display: flex;
        justify-content: space-between;
        color: var(--color-1);
    }

    .edit {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .property {
        display: flex;
        align-items: baseline;
        padding: 1rem;
        background: var(--color-bg-2);

        > span {
            margin-right: auto;
        }
    }

    .args {
        > li {
            display: flex;

            > button {
                width: 2rem;
                height: 2rem;
                background: none;
                border: none;
                color: var(--color-1);
            }
        }
    }

    .types {
        display: flex;
        gap: 2px;

        > button {
            text-align: left;
            padding: 0.5rem 0.5rem;
            border: 0;
            color: var(--color-bg-2);
            background: var(--color-1);
            font-weight: 600;
            font-size: 0.9rem;
            border-radius: 2px;
        }
    }

    .logs {
        margin-top: auto;
    }

    .code {
        display: flex;
        padding: 4rem;
        font-size: 0.9rem;
        font-weight: 500;
        height: 10rem;
    }
</style>
