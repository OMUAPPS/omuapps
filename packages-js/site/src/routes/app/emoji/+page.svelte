<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { version } from '$lib/version.json';
    import { Chat } from '@omujs/chat';
    import { Omu } from '@omujs/omu';
    import { ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { AppHeader, FlexRowWrapper, TableList, Textbox, Toggle, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import EmojiEdit from './EmojiEdit.svelte';
    import EmojiEntry from './EmojiEntry.svelte';
    import { APP, APP_ID } from './app.js';
    import { Emoji, EmojiApp, emojiApp } from './emoji.js';

    const omu = new Omu(APP);
    const chat = new Chat(omu);
    $emojiApp = new EmojiApp(omu, chat);
    const { emojis, config, selectedEmoji } = $emojiApp;
    setClient(omu);

    omu.plugins.require({
        omuplugin_emoji: `==${version}`,
    });
    omu.permissions.require(ASSET_UPLOAD_PERMISSION_ID);

    let search: string = '';

    let searchFilter: (key: string, emoji: Emoji) => boolean = () => true;

    function createFilter(search: string) {
        return (key: string, emoji: Emoji) => emoji.id.includes(search);
    }

    let uploading: number = 0;

    async function upload(files: Array<{ key: string; buffer: Uint8Array }>) {
        uploading++;
        const assets = await omu.assets.uploadMany(
            ...files.map(({ key, buffer }) => ({
                identifier: APP_ID.join(key),
                buffer,
            })),
        );
        assets.forEach((identifier) => {
            const name = identifier.path.at(-1);
            if (!name) return;
            const emoji = new Emoji({
                id: name,
                asset: identifier,
                patterns: [
                    {
                        type: 'text',
                        text: name,
                    },
                ],
            });
            emojis.add(emoji);
        });
        uploading--;
    }

    let fileDrop: HTMLInputElement;
    let files: FileList | undefined;

    async function uploadFiles() {
        if (!files) return;
        const selected = await Promise.all(
            Array.from(files).map(async (file) => {
                let name = file.name.split('.')[0];
                if (name.length === 0) {
                    name = `emoji-${Date.now().toString().slice(-6)}`;
                }
                const buffer = await file.arrayBuffer();
                return { key: name, buffer: new Uint8Array(buffer) };
            }),
        );
        upload(selected);
    }

    if (BROWSER) {
        omu.start();
    }

    function toggle() {
        $config = {
            ...$config,
            active: !$config.active,
        };
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP}>
            <FlexRowWrapper gap alignItems="center">
                <Textbox
                    placeholder="検索"
                    bind:value={search}
                    on:input={() => {
                        searchFilter = createFilter(search);
                    }}
                />
                <Toggle value={$config.active} handleToggle={toggle} />
            </FlexRowWrapper>
        </AppHeader>
    </header>
    <main>
        {#if $selectedEmoji}
            <div class="emoji-edit">
                <EmojiEdit emoji={$selectedEmoji} />
            </div>
        {/if}
        <div class="emojis">
            <button on:click={() => fileDrop.click()}>
                ファイルを選択してアップロード
                <i class="ti ti-upload" />
            </button>
            <input
                type="file"
                multiple
                hidden
                bind:files
                bind:this={fileDrop}
                on:change={uploadFiles}
                accept="image/*"
                placeholder="画像を選択"
            />
            {#if uploading > 0}
                <span>
                    <i class="ti ti-upload" />
                    アップロード中…
                </span>
            {/if}
            <div class="list">
                <TableList table={emojis} component={EmojiEntry} filter={searchFilter} />
            </div>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: var(--color-bg-1);
    }

    .list {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--color-bg-2);
    }

    .emoji-edit {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        padding: 20px;
        padding-bottom: 0;
    }

    .emojis {
        display: flex;
        flex-flow: column;
        gap: 10px;
        width: 100%;
        height: 100%;
        padding: 20px;
        padding-top: 10px;
        background: var(--color-bg-1);
    }

    button {
        outline: 1px solid var(--color-1);
        align-self: flex-start;
        display: flex;
        flex-direction: row;
        gap: 5px;
        align-items: center;
        width: fit-content;
        padding: 0.5rem 1rem;
        font-size: 14px;
        font-weight: bold;
        color: var(--color-1);
        cursor: pointer;
        background: var(--color-bg-2);
        border: none;

        i {
            font-size: 1.2em;
        }

        &:hover {
            outline: 1px solid var(--color-1);
        }
    }
</style>
