<script lang="ts">
    import { Button, Combobox, FileDrop, Textbox } from '@omujs/ui';
    import { QuizApp, type Asset, type Prompt } from '../../quiz-app';
    import RendererAsset from './AssetRenderer.svelte';

    const quizApp = QuizApp.getInstance();
    export let prompt: Prompt;

    async function handleUpload(files: FileList) {
        const assets: Asset[] = [];
        for (const file of files) {
            const asset = await quizApp.uploadAsset(file);
            assets.push(asset);
        }
        if (prompt.type !== 'asset') {
            throw new Error('Invalid state');
        }
        prompt.assets = [
            ...prompt.assets,
            ...assets,
        ];
    }
</script>

<div class="edit">
    <Combobox options={{
        text: {
            label: '文字',
            value: { type: 'text', body: '' },
        },
        asset: {
            label: '画像',
            value: { type: 'asset', assets: [] },
        },
    }} bind:value={prompt} key={prompt.type} />
    {#if prompt.type === 'text'}
        <Textbox bind:value={prompt.body} />
    {:else if prompt.type === 'asset'}
        <FileDrop primary multiple accept="image/*" handle={handleUpload}>
            画像を追加
        </FileDrop>
    {/if}
</div>
<div class="value">
    {#if prompt.type === 'asset'}
        <div class="assets">
            {#each prompt.assets as asset, index (index)}
                <div class="asset">
                    <Button onclick={() => {
                        if (prompt.type !== 'asset') return;
                        prompt.assets = prompt.assets.filter((_, it) => it !== index);
                    }}>
                        削除
                    </Button>
                    <RendererAsset {asset} />
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .edit {
        display: flex;
        align-items: stretch;
        gap: 1rem;
    }

    .assets {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 2rem;
    }

    .asset {
        width: 14rem;
        border: 1px solid var(--color-outline);
        padding: 1rem;
    }
</style>
