<script lang="ts">
    import { Align, Combobox, Slider } from '@omujs/ui';
    import { type RemoteApp } from '../remote-app.js';

    export let remote: RemoteApp;

    const { config } = remote;
</script>

<span class="setting">
    <p>整列</p>
    <Align bind:horizontal={$config.asset.align.x} bind:vertical={$config.asset.align.y} />
</span>
<span class="setting">
    <p>サイズ調整</p>
    <Combobox options={{
        contain: {
            label: '全体を表示',
            value: {type: 'contain'},
        },
        cover: {
            label: '全体を覆う',
            value: {type: 'cover'},
        },
        stretch: {
            label: '伸ばす',
            value: {
                type: 'stretch',
                width: {
                    type: 'percent',
                    value: 100,
                },
                height: {
                    type: 'percent',
                    value: 100,
                },
            },
        },
    }} bind:value={$config.asset.scaling} key={$config.asset.scaling.type} />
</span>

{#if $config.asset.scaling.type === 'stretch'}
    <span class="setting">
        <p>幅</p>
        <Slider min={0} max={100} step={1} bind:value={$config.asset.scaling.width.value} />
        <Combobox options={{
            percent: {
                label: 'パーセント',
                value: 'percent',
            },
            pixel: {
                label: 'ピクセル',
                value: 'pixel',
            },
        }} bind:value={$config.asset.scaling.width.type} />
    </span>
    <span class="setting">
        <p>高さ</p>
        <Slider min={0} max={100} step={1} bind:value={$config.asset.scaling.height.value} />
        <Combobox options={{
            percent: {
                label: 'パーセント',
                value: 'percent',
            },
            pixel: {
                label: 'ピクセル',
                value: 'pixel',
            },
        }} bind:value={$config.asset.scaling.height.type} />
    </span>
{/if}

<span class="setting">
    <p>アニメーション</p>
    <Combobox options={{
        none: {
            label: 'なし',
            value: {type: 'none'},
        },
        fade: {
            label: 'フェード',
            value: {type: 'fade', duration: 0.1},
        },
        flip: {
            label: 'フリップ',
            value: {type: 'flip', duration: 0.1},
        },
        slide: {
            label: 'スライド',
            value: {type: 'slide', duration: 0.1, direction: 'left'},
        },
    }} bind:value={$config.asset.animation} />
</span>

{#if $config.asset.animation.type !== 'none'}
    <span class="setting">
        <p>表示時間</p>
        <Slider min={0} max={10} step={0.1} bind:value={$config.asset.animation.duration} />
    </span>
{/if}
{#if $config.asset.animation.type === 'slide'}
    <span class="setting">
        <p>方向</p>
        <Combobox options={{
            left: {
                label: '左',
                value: 'left',
            },
            right: {
                label: '右',
                value: 'right',
            },
            up: {
                label: '上',
                value: 'up',
            },
            down: {
                label: '下',
                value: 'down',
            },
        }} bind:value={$config.asset.animation.direction} />
    </span>
{/if}

<span class="setting">
    <p>イージング</p>
    <Combobox options={{
        linear: {
            label: 'リニア',
            value: {type: 'linear'},
        },
        ease: {
            label: 'イーズ',
            value: {type: 'ease'},
        },
        bounce: {
            label: 'バウンス',
            value: {type: 'bounce'},
        },
        elastic: {
            label: 'エラスティック',
            value: {type: 'elastic'},
        },
    }} bind:value={$config.asset.easing} />
</span>

<style lang="scss">
    .setting {
        display: flex;
        align-items: baseline;
        width: 100%;
        gap: 0.5rem;
        font-size: 0.8621rem;
        color: var(--color-text);

        > p {
            margin-right: auto;
            white-space: nowrap;
        }
    }
</style>
