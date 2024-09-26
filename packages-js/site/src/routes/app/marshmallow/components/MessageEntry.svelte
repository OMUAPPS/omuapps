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
        <p>
            {entry.content.length}
            <small>文字</small>
            {entry.content.split('\n').length}
            <small>行</small>
            {#if entry.acknowledged}
                <small> - 既読</small>
            {/if}
        </p>
        <small>
            {#if current}
                クリックで選択を解除
                <i class="ti ti-x" />
            {:else}
                クリックでメッセージを表示
                <i class="ti ti-chevron-right" />
            {/if}
        </small>
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
        text-align: start;
        padding: 1rem;
        padding-right: 0.5rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-text);
        width: 100%;
        margin-bottom: 2px;
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
            padding-left: 0.25rem;
        }


        &.selected,
        &:hover {
            padding-left: 1.1rem;
            transition-duration: 0.0621s;
            transition-property: padding-left, background;
        }

        &:focus {
            padding-left: 0.9rem;
        }

        &.current {
            background: var(--color-bg-2);
            color: var(--color-1);
            border-right: 2px solid var(--color-1);
            padding-left: 1rem;
        }

        &:focus-visible {
            outline: 2px solid var(--color-1);
            outline-offset: -2px;
        }
    }
</style>
