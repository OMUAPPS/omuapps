<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { MarshmallowApp, type MarshmallowSkin } from '../marshmallow-app';
    import AssetImage from './AssetImage.svelte';

    interface Props {
        textures: MarshmallowSkin['textures'];
    }

    let { textures = $bindable() }: Props = $props();

    const marshmallowApp = MarshmallowApp.getInstance();
</script>

<p>上部</p>
<div class="image">
    <AssetImage asset={textures.top} />
</div>
<FileDrop handle={async (files) => {
    textures.top = await marshmallowApp.uploadAsset(files[0]);
}}>画像を変更</FileDrop>
<p>中部</p>
<div class="image">
    <AssetImage asset={textures.middle} />
</div>
<FileDrop handle={async (files) => {
    textures.middle = await marshmallowApp.uploadAsset(files[0]);
}}>画像を変更</FileDrop>
<p>下部</p>
<div class="image">
    <AssetImage asset={textures.bottom} />
</div>
<FileDrop handle={async (files) => {
    textures.bottom = await marshmallowApp.uploadAsset(files[0]);
}}>画像を変更</FileDrop>

<style lang="scss">
    p {
        margin-top: 1rem;
    }

    .image {
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
</style>
