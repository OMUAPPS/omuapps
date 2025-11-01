<script lang="ts">
    import { invLerp } from '$lib/math/math';
    import { Button, ExternalLink } from '@omujs/ui';
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
        const imageRect = imageContainer.getBoundingClientRect();
        const containerRect = currentTarget.getBoundingClientRect();
        $data.scroll = invLerp(containerRect.top, containerRect.bottom - imageRect.height, imageRect.top);
        if (!$data.pointer) return;
        updatePointer();
    }}
>
    {#if $data.message}
        <div class="close">
            <Button onclick={() => ($data.message = null)}>
                閉じる
                <i class="ti ti-x"></i>
            </Button>
        </div>
        <div class="message">
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
            <ExternalLink href={`https://marshmallow-qa.com/messages/${$data.message.id}`}>
                ブラウザーで開く
                <i class="ti ti-external-link"></i>
            </ExternalLink>
        </div>
        {#if $data.message}
            {#key $data.message.id}
                <MessageActions {api} message={$data.message} />
            {/key}
        {/if}
    {:else}
        <p>メッセージを選択するとここに表示されます</p>
    {/if}
</div>

<style lang="scss">

    .container {
        position: absolute;
        inset: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: center;
        overflow-y: auto;
        gap: 2rem;
        padding: 0 5%;
        padding-left: 5%;
        padding-top: 10%;
    }

    .close {
        position: absolute;
        top: 1rem;
        left: 1rem;
    }

    .message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        margin-bottom: 6rem;
    }

    .image {
        width: max(24rem, 70.21%);
        object-fit: contain;
    }

    img {
        width: 100%;
        height: 100%;
    }
</style>
