<script lang="ts">
    import { clamp } from '$lib/math/math';
    import { chat, MessageEntry, TableList, Tooltip } from '@omujs/ui';

    let isOpen = $state(false);
    let position = $state({ x: 50, y: 50 });
    let dragging: { x: number; y: number } | null = $state(null);
    let rect: DOMRect | undefined = $state();
</script>

<svelte:window
    onmouseup={() => {
        dragging = null;
    }}
    onmousemove={(e) => {
        if (dragging) {
            position = {
                x: window.innerWidth - e.clientX + dragging.x,
                y: window.innerHeight - e.clientY + dragging.y,
            };
        }
    }}
    onresize={() => {
        position = {
            x: Math.min(position.x, window.innerWidth - 100),
            y: Math.min(position.y, window.innerHeight - 50),
        };
    }}
/>
{#if isOpen}
    <div class="list" data-input style='right: {clamp(position.x, 0, window.innerWidth - (rect?.width ?? 0))}px; bottom: {clamp(position.y, 0, window.innerHeight - (rect?.height ?? 0))}px;'>
        <div class="content">
            <TableList table={$chat.messages} sort={(message) => message.createdAt.getTime()}>
                {#snippet component({ entry })}
                    <MessageEntry {entry} />
                {/snippet}
            </TableList>
        </div>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="header" onmousedown={(event) => {
            rect = event.currentTarget.getBoundingClientRect();
            dragging = {
                x: event.clientX - rect.right,
                y: event.clientY - rect.bottom,
            };
        }}>
            <p>チャット</p>
            <button title="" onclick={() => {
                isOpen = false;
            }}>
                <Tooltip>
                    閉じる
                </Tooltip>
                <i class="ti ti-x"></i>
            </button>
        </div>
    </div>
{:else}
    <button class="chat" data-input onclick={() => {
        isOpen = true;
    }} title="" style="position: fixed; right: 20px; bottom: 20px;">
        <Tooltip>
            チャットを開く
        </Tooltip>
        <i class="ti ti-message-2"></i>
    </button>
{/if}

<style lang="scss">
    .chat {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 25px;
        border: 2px solid var(--color-1);
        background: var(--color-bg-2);
        color: var(--color-1);
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }

    .list {
        position: absolute;
        background: color-mix(in srgb, var(--color-bg-2) 90%, transparent 0%);
        backdrop-filter: blur(1rem);
        filter: drop-shadow(0 0 0.25rem rgba(0,0,0,0.3));
        overflow-y: auto;

        > .content {
            transition: height 0.08s;
            width: 300px;
            height: 200px;

            &:hover {
                height: 600px;
            }
        }

        > .header {
            padding: 1rem 1rem;
            font-weight: bold;
            color: var(--color-text);
            background: var(--color-bg-2);
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            border-top: 1px solid var(--color-outline);
            cursor: grab;

            button {
                background: transparent;
                border: none;
                color: var(--color-text);
                cursor: pointer;
            }
        }
    }
</style>
