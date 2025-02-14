<script lang="ts">
    import type { CaptionApp } from './caption-app.js';

    export let captionApp: CaptionApp;
    export let placeholder = '';
    const { config } = captionApp;

    let text = placeholder;
    captionApp.listen((caption) => {
        text = caption.texts.join(' ');

        if (caption.final) {
            previosWidth = clientWidth;
        }
    });

    let previosWidth = 0;
    let clientWidth = 0;

    let fontFamily = '';
    $: {
        fontFamily = $config.style.fonts.map((font) => font.family).join(', ');
    }
</script>

{#each $config.style.fonts as font}
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
