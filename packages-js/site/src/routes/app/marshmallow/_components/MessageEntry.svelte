<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { Message } from '../api';
    import { MarshmallowApp } from '../marshmallow-app';
    import ElementRenderer from './ElementRenderer.svelte';
    const { data } = MarshmallowApp.getInstance();

    interface Props {
        message: Message;
    }

    let { message }: Props = $props();
</script>

<button class="message" onclick={() => {
    if ($data.message?.id === message.id) {
        $data.message = null;
    } else {
        $data.message = message;
    }
}} class:selected={$data.message?.id === message.id}>
    <Tooltip>
        {#if $data.message?.id === message.id}
            クリックで解除
        {:else}
            クリックで選択
        {/if}
    </Tooltip>
    <div class="header">
        <div class="content">
            <ElementRenderer block={message.content} />
        </div>
        <div class="meta">
            <span class="date">{message.date}</span>
        </div>
    </div>
    {#if message.reply}
        <div class="reply">
            <i class="ti ti-corner-down-right"></i>
            <ElementRenderer block={message.reply} />
        </div>
    {/if}
</button>

<style lang="scss">
    .message {
        appearance: none;
        background: var(--color-bg-2);
        color: var(--color-text);
        padding: 1rem;
        width: 100%;
        border: none;
        text-align: start;
        font-size: 0.8621rem;
        cursor: pointer;
        text-wrap: balance;

        &:hover {
            transform: translateX(0.25rem);
            transition: transform 0.04621s;
        }

        &.selected {
            outline: 1px solid var(--color-1);
            transition: transform 0.04621s;
            outline-offset: -6px;
        }

        &:active {
            transform: translateX(0.2rem);
            transition: transform 0s;
        }
    }

    .content {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 5;
        line-clamp: 5;
        overflow: hidden;
    }

    .date {
        font-size: 0.7rem;
        float: right;
    }

    .reply {
        color: var(--color-1);
        font-size: 0.8621rem;
    }
</style>
