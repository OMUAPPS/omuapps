<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { Message, RecentMessage } from '../marshmallow-app.js';
    import { selectedMessageId, selectMessage } from '../stores.js';

    export let entry: RecentMessage | Message;
    export let selected: boolean = false;
    
    $: current = $selectedMessageId === entry.message_id
</script>

<button
    class="message"
    class:current
    class:selected
    class:acknowledged={entry.acknowledged}
    on:click={() => $selectMessage(entry)}
>
    <Tooltip>
        {#if current}
            クリックで選択を解除
            <i class="ti ti-x" />
        {:else}
            クリックでメッセージを表示
            <i class="ti ti-chevron-right" />
        {/if}
    </Tooltip>
    <p>{entry.content}</p>
    {#if current}
        <i class="ti ti-chevron-right" />
    {/if}
</button>

<style lang="scss">
    .message {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 1rem 2rem;
        padding-right: 1rem;
        border: none;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        cursor: pointer;

        &.acknowledged {
            color: color-mix(in srgb, var(--color-text) 80%, transparent 50%);
        }

        > p {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        > i {
            margin-left: auto;
            padding-left: 0.25rem;
        }


        &.selected,
        &:hover {
            outline: none;
            padding-left: 2.25rem;
            transition-duration: 0.0621s;
            transition-property: padding-left, background, color;
        }

        &:focus {
            padding-left: 1.85rem;
        }

        &.current {
            background: var(--color-bg-1);
            color: var(--color-1);
            padding-left: 2rem;
        }
    }
</style>
