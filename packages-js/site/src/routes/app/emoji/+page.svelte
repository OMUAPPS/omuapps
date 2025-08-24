<script lang="ts">
    import AppPage from "$lib/components/AppPage.svelte";
    import { VERSION } from "$lib/version.js";
    import { Chat } from "@omujs/chat";
    import { Omu } from "@omujs/omu";
    import { ASSET_UPLOAD_PERMISSION_ID } from "@omujs/omu/extension/asset/asset-extension.js";
    import {
        AppHeader,
        Button,
        TableList,
        Textbox,
        Tooltip,
        setClient,
    } from "@omujs/ui";
    import { BROWSER } from "esm-env";
    import EmojiEdit from "./EmojiEdit.svelte";
    import EmojiEntry from "./EmojiEntry.svelte";
    import { APP, APP_ID } from "./app.js";
    import { EmojiApp, emojiApp, type Emoji } from "./emoji.js";

    const omu = new Omu(APP);
    const chat = Chat.create(omu);
    $emojiApp = new EmojiApp(omu, chat);
    const { emojis, selectedEmoji } = $emojiApp;
    setClient(omu);

    omu.plugins.require({
        omuplugin_emoji: `>=${VERSION}`,
    });
    omu.permissions.require(ASSET_UPLOAD_PERMISSION_ID);

    let search: string = "";

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
            const emoji: Emoji = {
                id: name,
                asset: identifier,
                patterns: [
                    {
                        type: "text",
                        text: name,
                    },
                ],
            };
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
                let name = file.name.split(".")[0];
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
</script>

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
<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <div class="config">
            <section>
                <span style="display: flex; gap: 0.5rem;">
                    <Textbox
                        placeholder="検索"
                        bind:value={search}
                        on:input={() => {
                            searchFilter = createFilter(search);
                        }}
                    />
                    <Button primary onclick={() => fileDrop.click()}>
                        <Tooltip>画像をアップロード</Tooltip>
                        <i class="ti ti-upload"></i>
                    </Button>
                </span>
            </section>
            <div>
                {#if uploading > 0}
                    <span>
                        <i class="ti ti-upload"></i>
                        アップロード中…
                    </span>
                {/if}
            </div>
            <div class="emojis">
                <TableList
                    table={emojis}
                    component={EmojiEntry}
                    filter={searchFilter}
                />
            </div>
        </div>
        <div class="edit omu-scroll">
            {#if $selectedEmoji}
                <div class="emoji-edit">
                    <EmojiEdit emoji={$selectedEmoji} />
                </div>
            {/if}
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        padding: 1rem;
        display: flex;
        flex-direction: row;
        gap: 1rem;
        justify-content: space-between;
    }

    .config {
        width: 24rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .edit {
        flex: 1;
        color: var(--color-text);
    }

    .emojis {
        flex: 1;
    }
</style>
