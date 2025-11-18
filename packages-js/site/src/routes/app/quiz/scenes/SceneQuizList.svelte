<script lang="ts">
    import { downloadFile } from '$lib/helper';
    import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
    import { Button, FileDrop, TableList, Tooltip } from '@omujs/ui';
    import { QuizApp, type Asset, type Quiz } from '../quiz-app';
    import QuizEntry from './_components/QuizEntry.svelte';
    import { selectedQuizzes } from './stores';

    const { omu, quizzes, assets } = QuizApp.getInstance();

    async function extractQuizzes() {
        const writer = new ByteWriter();
        const entries = await quizzes.getMany(...Object.entries($selectedQuizzes)
            .filter(([, checked]) => checked)
            .map(([id]) => id));
        const data = {
            quizzes: [...entries.values().filter((it) => !!it)],
        };
        const serialized = JSON.stringify(data);
        const extractedAssets: Record<string, Extract<Asset, { type: 'asset' }>> = {};
        for (const [assetKey, asset] of Object.entries($assets)) {
            if (asset.type === 'url') continue;
            if (!serialized.includes(assetKey)) continue;
            extractedAssets[assetKey] = asset;
        }
        writer.writeJSON(data);
        const assetEntries = Object.entries(extractedAssets);
        writer.writeULEB128(assetEntries.length);
        for (const [key, asset] of assetEntries) {
            writer.writeString(key);
            const { buffer } = await omu.assets.download(asset.id);
            writer.writeUint8Array(buffer);
        }
        downloadFile({
            filename: 'Quiz',
            content: writer.finish(),
            type: '.quiz',
        });
    }

    async function importQuizzes(blob: Blob) {
        const reader = await ByteReader.fromBlob(blob);

        for (const quiz of reader.readJSON<{ quizzes: Quiz[] }>().quizzes) {
            await quizzes.add(quiz);
        }
        const assetLength = reader.readULEB128();
        for (let i = 0; i < assetLength; i ++) {
            const key = reader.readString();
            const buffer = reader.readUint8Array();
            const id = await omu.assets.upload(key, buffer);
            $assets[id.key()] = { type: 'asset', id: id.key() };
        }
    }

    $: exportDisabled = !Object.entries($selectedQuizzes)
        .some(([, checked]) => checked);
</script>

<main>
    <h1>クイズ一覧</h1>
    <div class="actions">
        <FileDrop handle={async (files) => {
            await importQuizzes(files[0]);
        }} primary>
            クイズを読み込む
            <i class="ti ti-download"></i>
        </FileDrop>
        <Button onclick={extractQuizzes} disabled={exportDisabled}>
            {#if exportDisabled}
                <Tooltip>
                    書き出すには最低一つのクイズを選択する必要があります
                </Tooltip>
            {/if}
            クイズを書き出す
            <i class="ti ti-upload"></i>
        </Button>
    </div>
    <div class="quizzes">
        <TableList table={quizzes} component={QuizEntry} />
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
        padding: 10rem 2rem;
    }

    .actions {
        display: flex;
        margin-bottom: 3rem;
        gap: 1rem;
    }

    .quizzes {
        width: min(50rem, 100%);
        flex: 1;
    }
</style>
