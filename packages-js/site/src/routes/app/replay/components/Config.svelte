<script lang="ts">
    import { Align, Button, Checkbox, Combobox, Slider } from "@omujs/ui";
    import {
        DEFAULT_FILTER_BLUR,
        DEFAULT_FILTER_NOOP,
        DEFAULT_FILTER_PIXELATE,
        ReplayApp,
    } from "../replay-app.js";
    import Section from "./Section.svelte";
    import Setting from "./Setting.svelte";

    const { config } = ReplayApp.getInstance();

    export let showConfig: boolean;
</script>

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
        <Setting name="フィルター">
            <Combobox
                options={{
                    noop: {
                        label: "無し",
                        value: DEFAULT_FILTER_NOOP,
                    },
                    pixelate: {
                        label: "ピクセル化",
                        value: DEFAULT_FILTER_PIXELATE,
                    },
                    blur: {
                        label: "ぼかし",
                        value: DEFAULT_FILTER_BLUR,
                    },
                }}
                bind:value={$config.filter}
                key={$config.filter.type}
            />
        </Setting>
        {#if $config.filter.type !== "noop"}
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
            <div class="group">
                {#if $config.overlay.time.active}
                    <Setting name="長さを表示">
                        <Checkbox bind:value={$config.overlay.time.duration} />
                    </Setting>
                {/if}
            </div>
            <Setting name="タイトルを表示">
                <Checkbox bind:value={$config.overlay.title} />
            </Setting>
            <Setting name="配置">
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
        bottom: 2rem;
        width: 22rem;
        background: var(--color-bg-1);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: scroll;
        padding-right: 1rem;
    }
</style>
