<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import type { MarshmallowApp, Message, User } from '../marshmallow-app.js';

    export let marshmallow: MarshmallowApp;
    export let message: Message;
    export let user: User | null;
    const { config, data } = marshmallow;

    let container: HTMLElement;
    let buttons: HTMLElement;
    let image: HTMLImageElement;

    function handleScroll(event: Event) {
        const target = event.target as HTMLElement;
        let scroll = target.scrollTop;
        const imageHeight = image.clientHeight;
        const imageTop = image.offsetTop - buttons.clientHeight;
        scroll = (scroll - imageTop) / imageHeight;
        const imageRect = image.getBoundingClientRect();
        const x = (mouse.x - imageRect.x) / imageRect.width;
        const y = (mouse.y - imageRect.y) / imageRect.height;
        
        pointer = {
            x,
            y,
        };
        $data = {
            ...$data,
            scroll: Math.max(0, scroll),
            pointer: $data.pointer && pointer,
        };
    }

    let mouse: {
        x: number;
        y: number;
    } = {
        x: 0,
        y: 0,
    };
    let pointer: {
        x: number;
        y: number;
    } | null = null;

    function mouseMove(event: MouseEvent) {
        const imageRect = image.getBoundingClientRect();
        mouse = {
            x: event.clientX,
            y: event.clientY,
        };
        const x = (mouse.x - imageRect.x) / imageRect.width;
        const y = (mouse.y - imageRect.y) / imageRect.height;
        pointer = {
            x,
            y,
        };
    }

    let updateHandle: number | null = null;

    function updatePointer() {
        if (pointer) {
            $data.pointer = pointer;
        }
        updateHandle = requestAnimationFrame(updatePointer);
    }

    function mouseEnter() {
        updateHandle = requestAnimationFrame(updatePointer);
    }

    function mouseLeave() {
        if (updateHandle) {
            cancelAnimationFrame(updateHandle);
            updateHandle = null;
        }
        $data.pointer = null;
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
        message = await aknowledge();
        if (!$config.user) return;
        const messages = await marshmallow.getMessages($config.user);
        if (messages.length === 0) return;
        message = messages[0];
    }

    let textarea: HTMLTextAreaElement;

    async function aknowledge() {
        message = await lock(
            marshmallow.setAcknowledged(message.message_id, !message.acknowledged),
        );
        if ($config.user) {
            marshmallow.recentMessages.add({
                ...message,
                user_id: $config.user,
            })
            console.log(await marshmallow.recentMessages.fetchAll());
        }
        return message;
    }

    let replyText: string;

    async function reply() {
        await marshmallow.setReply(message.message_id, replyText);
        await next();
        replyText = '';
    }
</script>

<div class="buttons" class:locked bind:this={buttons}>
    <button
        class="check"
        class:active={message.acknowledged}
        on:click={aknowledge}
    >
        {#if message.acknowledged}
            <Tooltip>確認を解除</Tooltip>
            <i class="ti ti-check" />
        {:else}
            <Tooltip>確認済みにする</Tooltip>
            <i class="ti ti-check" />
        {/if}
    </button>
    <button
        class="like"
        class:active={message.liked}
        on:click={async () => {
            message = await lock(marshmallow.setLiked(message.message_id, !message.liked));
        }}
    >
        {#if message.liked}
            <Tooltip>お気に入りを解除</Tooltip>
            <i class="ti ti-heart-filled" />
        {:else}
            <Tooltip>お気に入りにする</Tooltip>
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
        class:active={$config.showPointer}
        on:click={() => {
            $config.showPointer = !$config.showPointer;
        }}
    >
        <Tooltip>
            {#if $config.showPointer}
                ポインターを非表示にする
            {:else}
                ポインターを表示する
            {/if}
        </Tooltip>
        <i class="ti ti-pointer" />
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
    <div class="message" role="presentation">
        <img
            src="https://media.marshmallow-qa.com/system/images/{message.message_id}.png"
            alt=""
            on:mousemove={mouseMove}
            on:mouseenter={mouseEnter}
            on:mouseleave={mouseLeave}
            bind:this={image}
        />
        {#if !message.acknowledged}
            <button class="next" on:click={() => next()}>
                <Tooltip>メッセージを確認済みにして次のメッセージに進む</Tooltip>
                確認して次へ
                <i class="ti ti-arrow-right" />
            </button>
        {/if}
        {#if !message.replied}
            {#if user?.premium}
                <textarea bind:value={replyText} placeholder="返信を入力" />
                <button class="next" on:click={() => reply()} disabled={!replyText}>
                    <Tooltip>
                        {replyText ? 'メッセージに返信して次のメッセージに進む' : '返信を入力して送信'}
                    </Tooltip>
                    送信して次へ
                    <i class="ti ti-arrow-right" />
                </button>
            {:else}
                <small class="premium">
                    <Tooltip>
                        マシュマロ公式サイトからプレミアム会員に入会することができます。
                    </Tooltip>
                    マシュマロのプレミアム会員になると返信機能が使えます
                    <i class="ti ti-crown" />
                </small>
            {/if}
        {/if}
        <textarea bind:this={textarea} readonly>{message.content}</textarea>
        <button class="copy" on:click={() => {
            textarea.select();
            document.execCommand('copy');
        }}>
            <Tooltip>メッセージをコピー</Tooltip>
            <i class="ti ti-clipboard" />
        </button>
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
            width: 100%;
            max-width: min(calc(100vw - 2rem), 26rem);
        }

        > textarea {
            white-space: pre-wrap;
            word-wrap: break-word;
            width: 100%;
            max-width: 26rem;
            height: 10rem;
            background: var(--color-bg-2);
            border: none;
            color: var(--color-1);
            font-size: 0.8rem;
            padding: 0.5rem;

            &:focus {
                outline: 2px solid var(--color-1);
                outline-offset: 1px;
            }
        }
    }

    button {
        background: var(--color-bg-2);
        color: var(--color-1);
        outline: 1px solid var(--color-1);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;

        &:focus,
        &:hover {
        }

        &:disabled {
            background: var(--color-bg-1);
            cursor: not-allowed;
            
            &:focus,
            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
            }
        }
    }

    .next {
        padding: 0.5rem 1rem;
        align-items: center;
        gap: 0.5rem;
    }
    
    .copy {
        width: 2rem;
        height: 2rem;
        outline: 1px solid var(--color-1);
    }

    .premium {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--color-1);
        margin-top: 1rem;
    }
</style>
