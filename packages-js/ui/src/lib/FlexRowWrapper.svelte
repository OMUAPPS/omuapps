<script lang="ts">
    export let between = false;
    export let reverse = false;
    export let widthFull = false;
    export let heightFull = false;
    export let wrap = false;
    export let baseline = false;
    export let gap = false;
    export let alignItems: 'start' | 'center' | 'end' | undefined = undefined;
    export let justifyContent:
        | 'start'
        | 'center'
        | 'end'
        | 'space-between'
        | 'space-around'
        | 'space-evenly'
        | undefined = undefined;
</script>

<div
    class:between
    class:reverse
    class:width={widthFull}
    class:height={heightFull}
    class:gap
    class:wrap
    class:baseline
    style:align-items={alignItems}
    style:justify-content={justifyContent}
>
    <slot />
</div>

<style>
    div {
        display: flex;
        flex-direction: row;
    }

    .between {
        justify-content: space-between;
    }

    .reverse {
        flex-direction: row-reverse;
    }

    .width {
        width: 100%;
    }

    .height {
        height: 100%;
    }

    .gap {
        gap: 10px;
    }

    .wrap {
        flex-wrap: wrap;
    }

    .baseline {
        align-items: baseline;
    }
</style>
