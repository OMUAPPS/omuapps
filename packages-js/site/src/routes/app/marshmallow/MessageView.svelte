<script lang="ts">
    import { invLerp } from '$lib/math/math';
    import { MarshmallowAPI } from './api';
    import { MarshmallowApp } from './marshmallow-app';
    import MessageActions from './MessageActions.svelte';

    export let api: MarshmallowAPI;

    const { data } = MarshmallowApp.getInstance();

    let imageContainer: HTMLElement;
    let mouse: { clientX: number; clientY: number } = { clientX: 0, clientY: 0 };

    function updatePointer() {
        const { clientX, clientY } = mouse;
        const { left, top, right, bottom } = imageContainer.getBoundingClientRect();
        $data.pointer = {
            x: invLerp(left, right, clientX),
            y: invLerp(top, bottom, clientY),
        };
    }
</script>

<div
    class="container omu-scroll"
    on:scroll={({ currentTarget }) => {
        $data.scroll = currentTarget.scrollTop / currentTarget.scrollHeight;
        updatePointer();
    }}
>
    {#if $data.message}
        <div class="image"
            role="img"
            on:mousemove={(event) => {
                mouse = event;
                updatePointer();
            }}
            on:mouseleave={() => {
                $data.pointer = null;
            }}
            bind:this={imageContainer}>
            <img
                src="https://media.marshmallow-qa.com/system/images/{$data.message.id}.png"
                alt=""
            />
        </div>
        {#if $data.message}
            <MessageActions {api} message={$data.message} />
        {/if}
    {/if}
</div>

<style lang="scss">
    .container {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 0 5%;
        padding-left: 5%;
        padding-top: 10%;
        overflow-y: auto;
        gap: 2rem;
    }

    .image {
        width: max(23rem, 36.21%);
        object-fit: contain;
        margin-bottom: 10rem;
    }

    img {
        width: 100%;
        height: 100%;
    }
</style>
