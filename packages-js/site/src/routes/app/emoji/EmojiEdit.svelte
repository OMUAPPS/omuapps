<script lang="ts">
    import { Author } from '@omujs/chat/models/author.js';
    import { content } from '@omujs/chat/models/index.js';
    import {
        ButtonMini,
        Combobox,
        FlexColWrapper,
        FlexRowWrapper,
        MessageRenderer,
        Tooltip,
        client,
    } from '@omujs/ui';
    import dummy_icon from './dummy_icon.svg';
    import { EMOJI_TEST_PROVIDER, emojiApp, type Emoji, type Pattern } from './emoji.js';

    export let emoji: Emoji;

    function addPattern(newPattern: Pattern) {
        emoji.patterns = [...emoji.patterns, newPattern];
    }

    const patternFactory: { [key: string]: { value: () => Pattern; label: string } } = {
        text: {
            value: () => ({ type: 'text', text: '' }),
            label: '文字',
        },
        regex: {
            value: () => ({ type: 'regex', regex: '' }),
            label: '正規表現',
        },
        image: {
            value: () => ({ type: 'image', id: '' }),
            label: '絵文字',
        },
    };

    function save() {
        $emojiApp.emojis.update(emoji);
    }

    function remove() {
        $emojiApp.emojis.remove(emoji);
    }
</script>

<FlexRowWrapper widthFull gap>
    <div class="preview">
        <MessageRenderer
            author={new Author({
                providerId: EMOJI_TEST_PROVIDER.id,
                id: EMOJI_TEST_PROVIDER.id.join(`${Date.now()}`),
                name: 'test',
                avatarUrl: new URL(dummy_icon, window.location.origin).toString(),
            })}
            content={new content.Root([new content.Asset(emoji.asset)])}
        />
        <MessageRenderer
            author={new Author({
                providerId: EMOJI_TEST_PROVIDER.id,
                id: EMOJI_TEST_PROVIDER.id.join(`${Date.now()}`),
                name: 'test',
                avatarUrl: new URL(dummy_icon, window.location.origin).toString(),
            })}
            content={new content.Root([new content.Text(emoji.id), new content.Asset(emoji.asset)])}
        />
        <MessageRenderer
            author={new Author({
                providerId: EMOJI_TEST_PROVIDER.id,
                id: EMOJI_TEST_PROVIDER.id.join(`${Date.now()}`),
                name: 'test',
                avatarUrl: new URL(dummy_icon, window.location.origin).toString(),
            })}
            content={new content.Root([
                new content.Asset(emoji.asset),
                new content.Asset(emoji.asset),
                new content.Asset(emoji.asset),
            ])}
        />
    </div>
    <div class="emoji-edit">
        <div class="left">
            <img src={$client.assets.url(emoji.asset)} alt={emoji.asset.key()} />
        </div>
        <FlexColWrapper widthFull gap>
            <FlexRowWrapper widthFull between>
                <FlexRowWrapper baseline gap>
                    <small>名前</small>
                    <input class="name" type="text" bind:value={emoji.id} placeholder="Name" />
                </FlexRowWrapper>
                <FlexRowWrapper gap>
                    <ButtonMini on:click={save}>
                        <Tooltip>保存</Tooltip>
                        <i class="ti ti-device-floppy" />
                    </ButtonMini>
                    <ButtonMini on:click={remove}>
                        <Tooltip>削除</Tooltip>
                        <i class="ti ti-trash" />
                    </ButtonMini>
                </FlexRowWrapper>
            </FlexRowWrapper>
            <div class="patterns">
                <small>パターン</small>
                {#each emoji.patterns as pattern}
                    <FlexRowWrapper widthFull between gap>
                        <div class="pattern">
                            <FlexRowWrapper widthFull between baseline>
                                {#if pattern.type === 'text'}
                                    <span>
                                        <i class="ti ti-txt" />
                                        文字
                                    </span>
                                    <input
                                        type="text"
                                        bind:value={pattern.text}
                                        placeholder="text"
                                    />
                                {:else if pattern.type === 'image'}
                                    <span>
                                        <i class="ti ti-photo" />
                                        絵文字
                                    </span>
                                    <input
                                        type="text"
                                        bind:value={pattern.id}
                                        placeholder="image id"
                                    />
                                {:else if pattern.type === 'regex'}
                                    <span>
                                        <i class="ti ti-regex" />
                                        正規表現
                                    </span>
                                    <input
                                        type="text"
                                        bind:value={pattern.regex}
                                        placeholder="regex"
                                    />
                                {/if}
                            </FlexRowWrapper>
                        </div>
                        <ButtonMini
                            on:click={() =>
                                (emoji.patterns = emoji.patterns.filter((p) => p !== pattern))}
                        >
                            <Tooltip>削除</Tooltip>
                            <i class="ti ti-trash" />
                        </ButtonMini>
                    </FlexRowWrapper>
                {/each}
                <FlexRowWrapper widthFull baseline gap>
                    <small>パターンを追加</small>
                    <Combobox
                        options={patternFactory}
                        on:change={(event) => addPattern(event.detail.value())}
                    />
                </FlexRowWrapper>
            </div>
        </FlexColWrapper>
    </div>
</FlexRowWrapper>

<style lang="scss">
    .emoji-edit {
        display: flex;
        flex-direction: row;
        gap: 10px;
        width: 600px;
        padding: 10px;
        background: var(--color-bg-2);
    }

    .preview {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        padding: 10px;
        background: var(--color-bg-2);
    }

    .left {
        display: flex;
        flex-direction: column;
        margin: 10px;
        gap: 10px;
        width: 100px;
        height: 100%;
    }

    .patterns {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 10px;
        gap: 10px;
        background: var(--color-bg-1);
    }

    .pattern {
        display: flex;
        flex-direction: row;
        gap: 10px;
        justify-content: space-between;
        align-items: baseline;
        padding: 2px 0;
        background: var(--color-bg-2);
        padding-left: 10px;
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
    }

    img {
        height: 100px;
        margin-right: 10px;
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
</style>
