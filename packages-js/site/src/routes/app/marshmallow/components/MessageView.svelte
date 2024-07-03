<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { MarshmallowApp, Message } from '../marshmallow-app.js';
    import { onMount } from 'svelte';

    export let marshmallow: MarshmallowApp;
    export let message: Message;
    const { config, data } = marshmallow;

    let container: HTMLElement;
    let image: HTMLImageElement;

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        let scroll = target.scrollTop;
        const imageHeight = image.clientHeight;
        const imageTop = image.offsetTop;
        scroll = (scroll - imageTop) / imageHeight;
        $data.scroll = scroll;
    }

    onMount(() => {
        const parent = container.parentElement;
        if (!parent) {
            throw new Error('Parent not found');
        }
        parent.addEventListener('scroll', handleScroll);

        return () => {
            parent.removeEventListener('scroll', handleScroll);
        };
    });

    let locked = false;

    async function lock<T>(promise: Promise<T>): Promise<T> {
        locked = true;
        try {
            return await promise;
        } finally {
            locked = false;
        }
    }

    async function next() {
        message = await lock(marshmallow.setAcknowledged(message.message_id, true));
        if (!$config.user) return;
        const messages = await marshmallow.getMessages($config.user);
        if (messages.length === 0) return;
        message = messages[0];
    }
</script>

<div class="buttons" class:locked>
    <button
        class="check"
        class:active={message.acknowledged}
        on:click={async () => {
            message = await lock(
                marshmallow.setAcknowledged(message.message_id, !message.acknowledged),
            );
        }}
    >
        <Tooltip>確認済みにする</Tooltip>
        <i class="ti ti-check" />
    </button>
    <button
        class="like"
        class:active={message.liked}
        on:click={async () => {
            message = await lock(marshmallow.setLiked(message.message_id, !message.liked));
        }}
    >
        <Tooltip>お気に入りにする</Tooltip>
        {#if message.liked}
            <i class="ti ti-heart-filled" />
        {:else}
            <i class="ti ti-heart" />
        {/if}
    </button>
    <a
        href="https://marshmallow-qa.com/messages/{message.message_id}"
        target="_blank"
        rel="noopener noreferrer"
    >
        <Tooltip>ブラウザで開く</Tooltip>
        <i class="ti ti-external-link" />
    </a>
    <button
        class="scroll"
        class:active={$config.syncScroll}
        on:click={() => {
            $config.syncScroll = !$config.syncScroll;
        }}
    >
        <Tooltip>
            {#if $config.syncScroll}
                スクロール同期を無効にする
            {:else}
                スクロール同期を有効にする
            {/if}
        </Tooltip>
        <i class="ti ti-arrow-autofit-down" />
    </button>
    <button
        class="close"
        on:click={() => {
            $data.message = null;
        }}
    >
        <Tooltip>メッセージを閉じる</Tooltip>
        <i class="ti ti-x" />
    </button>
</div>
<div bind:this={container}>
    <div class="message">
        <img
            src="https://media.marshmallow-qa.com/system/images/{message.message_id}.png"
            alt=""
            bind:this={image}
        />
        <button class="next" on:click={() => next()}>
            <Tooltip>メッセージを確認済みにして次のメッセージを表示</Tooltip>
            確認して次へ
            <i class="ti ti-arrow-right" />
        </button>
        <p>
            {message.content}
        </p>
    </div>
</div>

<style lang="scss">
    .buttons {
        position: sticky;
        top: 0;
        display: flex;
        justify-content: flex-end;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-outline);
        padding: 0.5rem 1rem;
        gap: 0.5rem;

        > button,
        > a {
            background: none;
            border: none;
            cursor: pointer;
            min-width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            color: var(--color-1);

            &:focus {
                outline: 2px solid var(--color-1);
                outline-offset: 1px;
            }
            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
            }
            &:active {
                outline: none;
            }
        }

        > .active {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        > .scroll {
            margin-left: auto;
        }

        &.locked {
            pointer-events: none;
            opacity: 0.5;
        }
    }

    .message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 1rem;

        > img {
            max-width: 100%;
            border-radius: 4px;
        }

        > p {
            white-space: pre-wrap;
            word-wrap: break-word;
            width: 100%;
        }
    }

    .next {
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        color: var(--color-1);
        padding: 0.5rem 1rem;
        border: none;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;

        &:focus,
        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }
</style>
