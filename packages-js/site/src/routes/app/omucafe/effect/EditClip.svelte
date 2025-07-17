<script lang="ts">
    import { Checkbox, FileDrop } from '@omujs/ui';
    import { uploadAssetByFile } from '../asset/asset.js';
    import { createClip, type Clip } from '../asset/audioclip.js';
    import EditAudioAsset from './EditAudioAsset.svelte';

    export let clip: Clip | undefined;

    async function handleChange(files: FileList) {
        const [file] = files;
        const asset = await uploadAssetByFile(file);
        clip ??= await createClip({}); 
        clip.asset = asset;
    }
</script>

<div class="clip">
    {#if clip}
        <EditAudioAsset bind:asset={clip.asset} />
        <FileDrop handle={handleChange}>
            音を変更
        </FileDrop>
        loop
        <Checkbox bind:value={clip.loop} />
    {:else}
        <FileDrop primary handle={handleChange}>
            音を追加
        </FileDrop>
    {/if}
</div>

<style>
    .clip {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        background: var(--color-bg-2);
    }
</style>
