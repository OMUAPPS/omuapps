<script lang="ts">
    import { run } from 'svelte/legacy';

    import { tick } from 'svelte';
    import { ARC4 } from '../../omucafe/game/random';
    import type { Message } from '../api';
    import { MarshmallowApp, type MarshmallowConfig, type MarshmallowScreen, type MarshmallowSkin } from '../marshmallow-app';
    import ElementRenderer from './ElementRenderer.svelte';

    interface Props {
        message: Message;
        width?: number;
        height?: number;
        pointer?: { x: number; y: number } | undefined | null;
        targetWidth?: number;
    }

    let {
        message,
        width = $bindable(1),
        height = $bindable(1),
        pointer = undefined,
        targetWidth = 350,
    }: Props = $props();

    const marshmallowApp = MarshmallowApp.getInstance();
    const { config, screen } = marshmallowApp;

    function getSkin(config: MarshmallowConfig, screen: MarshmallowScreen): MarshmallowSkin | undefined {
        if (screen.type === 'skins' && screen.state.type === 'edit') {
            return screen.state.skin;
        }
        const entries = Object.values(config.active_skins);
        if (entries.length === 0) return;
        const { id } = ARC4.fromString(message.id).choice(entries);
        return config.skins[id];
    }

    let skin = $derived(getSkin($config, $screen));
    let element: HTMLElement | undefined = $state(undefined);

    async function load(_: Message, _scale: number, skin?: MarshmallowSkin) {
        if (skin) {
            const top = await marshmallowApp.getAssetUrl(skin.textures.top);
            const middle = await marshmallowApp.getAssetUrl(skin.textures.middle);
            const bottom = await marshmallowApp.getAssetUrl(skin.textures.bottom);
            const cursor = skin.cursor.asset && await marshmallowApp.getAssetUrl(skin.cursor.asset);
            loadedSkin = { top, middle, bottom, cursor };
        } else {
            loadedSkin = undefined;
        }
        await tick();
        const rect = element!.getBoundingClientRect();
        width = targetWidth * scale;
        height = rect.height;
    }
    let loadedSkin: {
        top: string;
        middle: string;
        bottom: string;
        cursor?: string;
    } | undefined = $state(undefined);

    let scale = $derived(targetWidth / 600);
    run(() => {
        load(message, scale, skin);
    });
</script>

<svelte:head>
    {#if skin?.text.font.family}
        <link href="https://fonts.googleapis.com/css2?family={encodeURIComponent(skin?.text.font.family)}&display=swap" rel="stylesheet">
    {/if}
</svelte:head>

<div class="message" class:has-pointer={!!pointer} style="scale: {scale}; width: {targetWidth}px; height: {height}px">
    {#if skin}
        {#if loadedSkin}
            <div class="skin" bind:this={element}>
                <img src={loadedSkin.top} alt="">
                <div
                    class="content"
                    style="padding-bottom: {skin.textures.min_height}px; background-image: url({loadedSkin.middle});"
                    style:font-family={skin.text.font.family}
                    style:font-weight={skin.text.font.weight}
                    style:color={skin.text.color}
                >
                    <ElementRenderer block={message.content} />
                </div>
                <img src={loadedSkin.bottom} alt="">
                <p class="watermark" class:top={skin.watermark.side === 'top'} style="padding: {skin.watermark.margin.y}px {skin.watermark.margin.x}px;">
                    マシュマロ
                </p>
            </div>
        {/if}
    {:else}
        <div class="img" bind:this={element}>
            <img
                width="{targetWidth}px"
                src="https://media.marshmallow-qa.com/system/images/{message.id}.png"
                alt=""
            />
        </div>
    {/if}
    {#if pointer}
        <div
            class="pointer"
            style:left="{pointer.x * targetWidth / scale}px"
            style:top="{pointer.y * height / scale}px"
            style:scale={(skin?.cursor.scale ?? 1)}
            style="transform-origin: {skin?.cursor.x ?? 0}px {skin?.cursor.y ?? 0}px;"
        >
            {#if loadedSkin?.cursor}
                <img src={loadedSkin.cursor} alt="">
            {:else}
                <i class="ti ti-pointer-filled"></i>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .message {
        transform-origin: left top;

        &.has-pointer {
            cursor: none;
        }
    }

    .skin {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 600px;

        > .watermark {
            position: absolute;
            inset: 0;
            color: #aaa;
            font-weight: 500;
            display: flex;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            pointer-events: none;
        }
    }

    img {
        width: 600px;
        pointer-events: none;
    }

    .content {
        position: relative;
        width: 600px;
        font-size: 24px;
        font-weight: 400;
        line-height: 185%;
        padding: 0 50px;
        color: #333;
        line-break: anywhere;
        white-space: pre-wrap;
    }

    .pointer {
        position: absolute;
        transform: translate(-25%, -75%);
        width: 20px;
        height: 20px;
        -webkit-text-stroke: 2.5px #fff;
        color: var(--color-1);
        font-size: 2.6rem;
        text-shadow: rgba(0, 0, 0, 0.5) 2px 2px 5px;
        pointer-events: none;

        > img {
            width: fit-content;
        }
    }
</style>
