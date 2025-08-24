<script lang="ts">
    import { Tooltip, client } from "@omujs/ui";
    import { emojiApp, type Emoji } from "./emoji.js";

    const { emojis, selectedEmoji } = $emojiApp;

    export let entry: Emoji;
    export let selected: boolean = false;

    function copyName() {
        navigator.clipboard.writeText(entry.id);
    }

    function testEmoji() {
        $emojiApp.testEmoji(entry);
    }
    function editEmoji() {
        $selectedEmoji = entry;
    }
    function deleteEmoji() {
        emojis.remove(entry);
    }
</script>

<div class="entry" class:selected>
    <div>
        <Tooltip>
            <img
                src={$client.assets.url(entry.asset)}
                alt={entry.asset.key()}
                class="preview"
            />
        </Tooltip>
        <img src={$client.assets.url(entry.asset)} alt={entry.asset.key()} />
    </div>
    <div class="info">
        <button class="name" on:click={copyName}>
            <Tooltip>クリックで名前をコピー</Tooltip>
            {entry.id}
        </button>
        <small>
            {entry.patterns
                .map((pattern) => {
                    if (pattern.type === "text") {
                        return pattern.text;
                    }
                    if (pattern.type === "image") {
                        return `:${pattern.id}:`;
                    }
                    if (pattern.type === "regex") {
                        return pattern.regex;
                    }
                    return "";
                })
                .join(", ")}
        </small>
    </div>
    {#if selected}
        <div class="actions">
            <button on:click={testEmoji}>
                <Tooltip>テスト</Tooltip>
                <i class="ti ti-send"></i>
            </button>
            <button on:click={editEmoji}>
                <Tooltip>編集</Tooltip>
                <i class="ti ti-pencil"></i>
            </button>
            <button on:click={deleteEmoji}>
                <Tooltip>削除</Tooltip>
                <i class="ti ti-trash"></i>
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        padding: 1rem;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-bg-1);

        &.selected {
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }
    }

    .preview {
        width: 10rem;
        height: 10rem;
        max-width: fit-content;
        max-height: fit-content;
    }

    small {
        font-size: 0.6em;
    }

    img {
        width: 2.5rem;
        height: 2.5rem;
        margin-right: 0.5rem;
        object-fit: contain;
    }

    .info {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        padding: 0 0.5rem;

        > .name {
            font-size: 0.9rem;
            color: var(--color-1);
        }

        > small {
            font-size: 0.6rem;
            color: var(--color-text);
        }
    }

    .actions {
        display: flex;
        gap: 2px;

        > button {
            padding: 0.75rem;
            background: var(--color-1);
            color: var(--color-bg-1);

            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }

    button {
        display: flex;
        align-items: center;
        background: none;
        gap: 0.5rem;
        border: none;
        font-weight: 600;
        font-size: 0.8rem;
        border-radius: 2px;
        cursor: pointer;
    }
</style>
