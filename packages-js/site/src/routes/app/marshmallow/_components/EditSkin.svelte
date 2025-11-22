<script lang="ts">

    import { downloadFile } from '$lib/helper';
    import { Button, Combobox, FileDrop, Slider, Textbox, Tooltip } from '@omujs/ui';
    import { MarshmallowApp, type MarshmallowSkin } from '../marshmallow-app';
    import AssetImage from './AssetImage.svelte';
    import EditSkinTextures from './EditSkinTextures.svelte';

    interface Props {
        skin: MarshmallowSkin;
    }

    let { skin = $bindable() }: Props = $props();

    const marshmallowApp = MarshmallowApp.getInstance();
    const { screen, config } = marshmallowApp;

    function remove() {
        delete $config.skins[skin.id];
        delete $config.active_skins[skin.id];
        $screen = { type: 'skins', state: { type: 'list' } };
    }

    let buffer: Uint8Array | undefined = undefined;
    async function updateDownload(skin: MarshmallowSkin) {
        buffer = undefined;
        buffer = await marshmallowApp.downloadSkin(skin);
    }

    $effect(() => {
        updateDownload(skin);
        $config.skins[skin.id] = skin;
    });

    function download() {
        if (!buffer) return;

        downloadFile({
            filename: `${skin.meta.name}.marshmallow`,
            content: buffer,
            type: '.marshmallow',
        });
    }
</script>

<div class="actions">
    <Button onclick={remove}>
        <Tooltip>
            この着せ替えを削除
        </Tooltip>
        <i class="ti ti-trash"></i>
    </Button>
    <Button onclick={download}>
        書き出し
        <i class="ti ti-download"></i>
    </Button>
    <Button primary onclick={() => {
        $screen = { type: 'skins', state: { type: 'list' } };
    }}>
        保存
        <i class="ti ti-check"></i>
    </Button>
</div>
<h3>情報</h3>
<section>
    <h4>名前</h4>
    <Textbox bind:value={skin.meta.name} />
    <h4>説明</h4>
    <Textbox bind:value={skin.meta.note} />
</section>
<h3>背景</h3>
<section>
    <EditSkinTextures bind:textures={skin.textures} />
</section>
<h3>文字</h3>
<section>
    <h4>フォント</h4>
    <Textbox bind:value={skin.text.font.family} />
    <h4>太さ</h4>
    <Textbox bind:value={skin.text.font.weight} />
    <h4>色</h4>
    <input type="color" bind:value="{skin.text.color}">
</section>
<h3>カーソル</h3>
<section>
    <h4>画像</h4>
    <div class="image">
        <AssetImage asset={skin.cursor.asset} />
    </div>
    <FileDrop handle={async (files) => {
        skin.cursor.asset = await marshmallowApp.uploadAsset(files[0]);
    }}>
        画像を変更
    </FileDrop>
    <h4>位置</h4>
    <p>
        x
        <Slider bind:value={skin.cursor.x} min={-50} max={50} step={1} />
    </p>
    <p>
        y
        <Slider bind:value={skin.cursor.y} min={-50} max={50} step={1} />
    </p>
    <h4>大きさ</h4>
    <p>
        <Slider bind:value={skin.cursor.scale} min={0} max={10} step={0.2} />
    </p>
</section>
<h3>アニメーション</h3>
<section>
    <Combobox options={{
        default: {
            label: '無し',
            value: { type: 'default' },
        },
        paper: {
            label: '紙',
            value: { type: 'paper' },
        },
    }} bind:value={skin.transition.in} key={skin.transition.in.type} />
</section>

<style lang="scss">
    h3 {
        margin-top: 1rem;
        color: var(--color-1);
        font-size: 1rem;
    }

    h4 {
        font-size: 0.8rem;
    }

    .actions {
        display: flex;
        justify-content: space-between;
        background: var(--color-bg-2);
        padding: 1rem;
    }

    section {
        background: var(--color-bg-2);
        padding: 1rem;
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
