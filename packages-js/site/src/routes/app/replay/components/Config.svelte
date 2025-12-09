<script lang="ts">
    import { Vec4, type Vec4Like } from '$lib/math/vec4.js';
    import { Align, Button, Checkbox, Combobox, Slider, Tooltip } from '@omujs/ui';
    import {
        DEFAULT_FILTER_BLUR,
        DEFAULT_FILTER_COLOR_KEY,
        DEFAULT_FILTER_NOOP,
        DEFAULT_FILTER_PIXELATE,
        ReplayApp,
    } from '../replay-app.js';
    import Section from './Section.svelte';
    import Setting from './Setting.svelte';

    const { config } = ReplayApp.getInstance();

    interface Props {
        showConfig: boolean;
    }

    let { showConfig = $bindable() }: Props = $props();
</script>

{#snippet colorButton(color: Vec4Like, name: string)}
    <button class="color-button" class:selected={$config.filter.type === 'color_key' && Vec4.from(color).equal($config.filter.color)} style:background="#{Vec4.from(color).toColorHex()}" onclick={() => {
        if ($config.filter.type !== 'color_key') return;
        $config.filter.color = color;
    }}>
        <Tooltip>
            {name}
        </Tooltip>
    </button>
{/snippet}
<div class="config omu-scroll">
    <Button
        onclick={() => {
            showConfig = false;
        }}
        primary
    >
        閉じる
        <i class="ti ti-x"></i>
    </Button>
    <Section name="動画">
        <Setting name="フィルター" disableAuto>
            <Combobox
                options={{
                    noop: {
                        label: '無し',
                        value: DEFAULT_FILTER_NOOP,
                    },
                    pixelate: {
                        label: 'ピクセル化',
                        value: DEFAULT_FILTER_PIXELATE,
                    },
                    blur: {
                        label: 'ぼかし',
                        value: DEFAULT_FILTER_BLUR,
                    },
                    color_key: {
                        label: '色削除',
                        value: DEFAULT_FILTER_COLOR_KEY,
                    },
                }}
                bind:value={$config.filter}
                key={$config.filter.type}
            />
        </Setting>
        {#if $config.filter.type === 'noop'}
            <small>色を削除したりモザイクをかけられます</small>
        {:else if $config.filter.type === 'color_key'}
            <Setting name="色" disableAuto>
                {@render colorButton({ x: 0, y: 1, z: 0, w: 1 }, '緑')}
                {@render colorButton({ x: 0, y: 0, z: 1, w: 1 }, '青')}
                {@render colorButton({ x: 1, y: 0, z: 0, w: 1 }, '赤')}
            </Setting>
            <Setting name="強さ">
                <Slider
                    bind:value={$config.filter.sub}
                    min={1}
                    max={100}
                    step={1}
                />
            </Setting>
            <Setting name="拡張">
                <Slider
                    bind:value={$config.filter.add}
                    min={1 - $config.filter.sub}
                    max={100}
                    step={1}
                />
            </Setting>
        {:else}
            <Setting name="強さ">
                <Slider
                    bind:value={$config.filter.radius}
                    min={1}
                    max={100}
                    step={1}
                />
            </Setting>
        {/if}
    </Section>
    <Section name="情報">
        <Setting name="情報を表示する">
            <Checkbox bind:value={$config.overlay.active} />
        </Setting>
        {#if $config.overlay.active}
            <Setting name="動画を隠す">
                <Checkbox bind:value={$config.overlay.hideVideo} />
            </Setting>
            <Setting name="時間を表示">
                <Checkbox bind:value={$config.overlay.time.active} />
            </Setting>
            {#if $config.overlay.time.active}
                <div class="group">
                    <Setting name="長さを表示">
                        <Checkbox bind:value={$config.overlay.time.duration} />
                    </Setting>
                </div>
            {/if}
            <Setting name="タイトルを表示">
                <Checkbox bind:value={$config.overlay.title} />
            </Setting>
            <Setting name="配置" disableAuto>
                <Align
                    bind:horizontal={$config.overlay.align.horizontal}
                    bind:vertical={$config.overlay.align.vertical}
                />
            </Setting>
        {/if}
    </Section>
</div>

<style lang="scss">
    .config {
        position: absolute;
        top: 2rem;
        right: 0;
        bottom: 2rem;
        width: 24rem;
        background: var(--color-bg-1);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: scroll;
        padding-right: 1rem;
    }

    small {
        font-size: 0.8rem;
        padding: 0.75rem 1rem;
        color: var(--color-text);
    }

    .color-button {
        width: 1.25rem;
        height: 1.25rem;
        padding: 0.25rem;
        border-radius: 999rem;
        outline: 2px solid var(--color-bg-2);
        outline-offset: 2px;
        border: none;
        cursor: pointer;

        &:hover {
            outline: 2px solid var(--color-1);
            outline-offset: 3px;
        }

        &.selected {
            outline: 2px solid var(--color-1);
            outline-offset: 2px;
            transition: outline-offset 0.1621s;
        }

        &:active {
            outline: 2px solid var(--color-1);
            outline-offset: 2px;
            transition: outline-offset 0.1621s;
        }
    }
</style>
