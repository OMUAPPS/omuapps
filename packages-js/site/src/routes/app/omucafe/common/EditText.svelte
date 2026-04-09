<script lang="ts">
    import { clamp } from '$lib/math/math';

    interface Props {
        value: string;
        size: string;
    }

    let {
        value = $bindable(),
        size,
    }: Props = $props();

    let textWidth = $state(0);
    let containerWidth = $state(0);
    let scale = $derived(clamp(containerWidth / textWidth, 1 / 2, 1));
</script>

<div class="container" bind:clientWidth={containerWidth}>
    <prec class="measure" bind:clientWidth={textWidth} style="font-size: {size};">{value}</prec>
    <textarea bind:value={value} style="font-size: calc({size} * {scale});"></textarea>
</div>

<style lang="scss">
    .container {
        width: 100%;
        height: fit-content;
        font-family: "Zen Maru Gothic", sans-serif;
        font-weight: 700;
        font-style: normal;
    }

    .measure {
        position: absolute;
        pointer-events: none;
        white-space: nowrap;
        visibility: hidden;
    }

    textarea {
        width: 100%;
        border: none;
        background: none;
        text-align: center;
        font-size: inherit;
        font-family: "Zen Maru Gothic", sans-serif;
        font-weight: 700;
        font-style: normal;
        padding: 0;
        margin: 0;
        text-align: center;
        resize: none;
        field-sizing: content;

        &:focus {
            outline: none;
        }
    }
</style>
