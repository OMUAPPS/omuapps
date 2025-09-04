<script lang="ts">
    import { Author } from "@omujs/chat/models";
    import {
        Button,
        Combobox,
        MessageRenderer,
        Tooltip,
        client,
    } from "@omujs/ui";
    import dummy_icon from "./dummy_icon.svg";
    import {
        EMOJI_TEST_PROVIDER,
        emojiApp,
        type Emoji,
        type Pattern,
    } from "./emoji.js";

    export let emoji: Emoji;
    let serialized = JSON.stringify(emoji);

    function addPattern(newPattern: Pattern) {
        emoji.patterns = [...emoji.patterns, newPattern];
    }

    const patternFactory: {
        [key: string]: { value: () => Pattern; label: string };
    } = {
        text: {
            value: () => ({ type: "text", text: "" }),
            label: "文字",
        },
        regex: {
            value: () => ({ type: "regex", regex: "" }),
            label: "正規表現",
        },
        image: {
            value: () => ({ type: "image", id: "" }),
            label: "絵文字",
        },
    };

    function save() {
        $emojiApp.emojis.update(emoji);
        serialized = JSON.stringify(emoji);
    }

    function remove() {
        $emojiApp.emojis.remove(emoji);
    }

    const TEST_AUTHOR = new Author({
        providerId: EMOJI_TEST_PROVIDER.id,
        id: EMOJI_TEST_PROVIDER.id.join(`${Date.now()}`),
        name: "test",
        avatarUrl: new URL(dummy_icon, window.location.origin).toString(),
    });
</script>

<div class="emoji-edit">
    <div class="flex col width gap">
        <div class="flex width between">
            <div class="flex baseline gap">
                <small>名前</small>
                <input
                    class="name"
                    type="text"
                    bind:value={emoji.id}
                    placeholder="Name"
                />
            </div>
            <div class="flex gap">
                <Button
                    primary={serialized !== JSON.stringify(emoji)}
                    onclick={save}
                >
                    <Tooltip>保存</Tooltip>
                    <i class="ti ti-device-floppy"></i>
                </Button>
                <Button onclick={remove}>
                    <Tooltip>削除</Tooltip>
                    <i class="ti ti-trash"></i>
                </Button>
            </div>
        </div>
        <div class="patterns">
            <small>パターン</small>
            {#each emoji.patterns as pattern, i (i)}
                <div class="pattern">
                    <div class="flex width between baseline">
                        {#if pattern.type === "text"}
                            <span>
                                <i class="ti ti-txt"></i>
                                文字
                            </span>
                            <input
                                type="text"
                                bind:value={pattern.text}
                                placeholder="text"
                            />
                        {:else if pattern.type === "image"}
                            <span>
                                <i class="ti ti-photo"></i>
                                絵文字
                            </span>
                            <input
                                type="text"
                                bind:value={pattern.id}
                                placeholder="image id"
                            />
                        {:else if pattern.type === "regex"}
                            <span>
                                <i class="ti ti-regex"></i>
                                正規表現
                            </span>
                            <input
                                type="text"
                                bind:value={pattern.regex}
                                placeholder="regex"
                            />
                        {/if}
                    </div>
                    <button
                        on:click={() =>
                            (emoji.patterns = emoji.patterns.filter(
                                (p) => p !== pattern,
                            ))}
                    >
                        <Tooltip>削除</Tooltip>
                        <i class="ti ti-x"></i>
                    </button>
                </div>
            {/each}
            <div class="flex width baseline gap">
                <small>パターンを追加</small>
                <Combobox
                    options={patternFactory}
                    value={null}
                    on:change={(event) =>
                        event.detail.value != null &&
                        addPattern(event.detail.value())}
                />
            </div>
        </div>
    </div>
    <img src={$client.assets.url(emoji.asset)} alt={emoji.asset.key()} />
</div>
<div class="preview">
    <MessageRenderer
        author={TEST_AUTHOR}
        content={{
            type: "root",
            data: [{ type: "asset", data: { id: emoji.asset.key() } }],
        }}
    />
    <MessageRenderer
        author={TEST_AUTHOR}
        content={{
            type: "root",
            data: [
                { type: "text", data: emoji.id },
                { type: "asset", data: { id: emoji.asset.key() } },
            ],
        }}
    />
    <MessageRenderer
        author={TEST_AUTHOR}
        content={{
            type: "root",
            data: [
                { type: "asset", data: { id: emoji.asset.key() } },
                { type: "asset", data: { id: emoji.asset.key() } },
                { type: "asset", data: { id: emoji.asset.key() } },
            ],
        }}
    />
</div>

<style lang="scss">
    .emoji-edit {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--color-bg-2);
    }

    .preview {
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--color-outline);
        padding-top: 1rem;
        margin-top: 1rem;
    }

    .patterns {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 1rem;
        gap: 0.5rem;
        background: var(--color-bg-1);
    }

    .pattern {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        padding-right: 0.25rem;
        background: var(--color-bg-2);
        font-size: 0.8rem;
        font-weight: 600;
        width: 100%;
        color: var(--color-1);

        input {
            padding: 5px;
            border: 1px solid var(--color-1);
            background: var(--color-bg-2);
            color: var(--color-1);
        }

        > button {
            background: none;
            border: none;
            background: var(--color-bg-1);
            color: var(--color-1);
            width: 2rem;
            height: 2rem;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
            }
        }
    }

    img {
        width: 10rem;
        margin: 0 2rem;
        object-fit: contain;
    }

    .name {
        font-size: 1.2em;
        font-weight: bold;
        color: var(--color-1);
        border: none;
        border-bottom: 2px solid var(--color-1);
    }

    small {
        font-size: 0.8em;
        font-weight: bold;
        color: var(--color-1);
    }

    .flex {
        display: flex;
    }

    .col {
        flex-direction: column;
    }

    .width {
        width: 100%;
    }

    .baseline {
        align-items: baseline;
    }

    .between {
        justify-content: space-between;
    }

    .gap {
        gap: 1rem;
    }
</style>
