<script lang="ts">
    import { ButtonMini, FlexRowWrapper, Tooltip, client } from '@omujs/ui';
    import { Emoji, emojiApp } from './emoji.js';

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

<div class="emoji-entry" class:selected>
    <FlexRowWrapper>
        <Tooltip>
            <img src={$client.assets.url(entry.asset)} alt={entry.asset.key()} class="preview" />
        </Tooltip>
        <img src={$client.assets.url(entry.asset)} alt={entry.asset.key()} />
    </FlexRowWrapper>
    <div class="info">
        <button class="name" on:click={copyName}>
            <Tooltip>クリックで名前をコピー</Tooltip>
            {entry.id}
        </button>
        <small>
            {entry.getPatternText()}
        </small>
    </div>
    {#if selected}
        <FlexRowWrapper>
            <ButtonMini on:click={testEmoji}>
                <Tooltip>テスト</Tooltip>
                <i class="ti ti-send"></i>
            </ButtonMini>
            <ButtonMini on:click={editEmoji}>
                <Tooltip>編集</Tooltip>
                <i class="ti ti-pencil"></i>
            </ButtonMini>
            <ButtonMini on:click={deleteEmoji}>
                <Tooltip>削除</Tooltip>
                <i class="ti ti-trash"></i>
            </ButtonMini>
        </FlexRowWrapper>
    {/if}
</div>

<style lang="scss">
    .emoji-entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        padding: 15px;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-bg-1);
    }

    .preview {
        height: auto;
        max-height: 128px;
    }

    small {
        font-size: 0.6em;
    }

    img {
        width: 40px;
        height: 40px;
        margin-right: 10px;
        object-fit: contain;
    }

    .selected {
        outline: 1px solid var(--color-1);
        outline-offset: -4px;
    }

    .info {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        margin-right: 10px;
        margin-left: 5px;

        > button {
            display: flex;
            flex-direction: row;
            gap: 5px;
            align-items: center;
            color: var(--color-text);
            cursor: pointer;
            background: none;
            border: none;

            &:hover {
                color: var(--color-1);
            }
        }
    }

    .name {
        font-size: 1em;
        font-weight: bold;
    }
</style>
