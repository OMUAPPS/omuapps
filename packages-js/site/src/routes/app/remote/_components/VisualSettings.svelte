<script lang="ts">
    import { Align, Combobox } from '@omujs/ui';
    import { type RemoteApp } from '../remote-app.js';

    export let remote: RemoteApp;

    const { config } = remote;
</script>

<span class="setting">
    整列
    <Align bind:horizontal={$config.asset.align.x} bind:vertical={$config.asset.align.y} />
</span>
<span class="setting">
    サイズ調整
    <Combobox options={{
        contain: {
            label: '全体を表示',
            value: 'contain',
        },
        cover: {
            label: '全体を覆う',
            value: 'cover',
        },
    }} bind:value={$config.asset.scaling} />
</span>

<style lang="scss">
    .setting {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }
</style>
