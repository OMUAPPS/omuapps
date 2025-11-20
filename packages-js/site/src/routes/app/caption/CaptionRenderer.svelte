<script lang="ts">
    import { run } from 'svelte/legacy';

    import type { CaptionApp } from './caption-app.js';

    interface Props {
        captionApp: CaptionApp;
        placeholder?: string;
    }

    let { captionApp, placeholder = '' }: Props = $props();
    const { omu, config } = captionApp;

    let text = $state(placeholder);
    omu.dashboard.speechRecognition.listen((status) => {
        if (status.type !== 'final') return;
        const { segments } = status;
        text = segments.map((segment) => segment.transcript).join();
    });

    let previosWidth = 0;
    let clientWidth = $state(0);

    let fontFamily = $state('');
    run(() => {
        fontFamily = $config.style.fonts.map((font) => font.family).join(', ');
    });
</script>

{#each $config.style.fonts as font, i (i)}
    <link href={font.url} rel="stylesheet" />
{/each}
{#if text}
    <div
        style:min-width="{previosWidth}px"
        style:color={$config.style.color}
        style:background={$config.style.backgroundColor}
    >
        <p
            bind:clientWidth
            style:font-family={fontFamily}
            style:font-size="{$config.style.fontSize}px"
            style:font-weight={$config.style.fontWeight}
        >
            {text}
        </p>
    </div>
{/if}

<style lang="scss">
    div {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0;
        padding: 1rem 2rem;
        width: fit-content;
        font-size: 2rem;
    }

    p {
        width: fit-content;
    }
</style>
