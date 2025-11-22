<script lang="ts">
    import { run } from 'svelte/legacy';

    import PhotoScreen from '../components/PhotoScreen.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from './scene.js';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();
    const { scene, gameConfig } = getGame();
    run(() => {
        console.log('ScenePhotoMode', context);
    });
</script>

<svelte:window
    onwheel={(event) => {
        let scale = $gameConfig.photo_mode.scale;
        const logFactor = 2.621;
        const wheelFactor = 0.002621;
        if ($gameConfig.photo_mode.tool.type === 'move') {
            scale += event.deltaY * -0.01;
            $gameConfig.photo_mode.scale = Math.min(Math.max(-10, scale), 10);
        } else if ($gameConfig.photo_mode.tool.type === 'pen') {
            const level = Math.pow($gameConfig.photo_mode.pen.width, 1 / logFactor);
            const newLevel = level + event.deltaY * wheelFactor;
            const newWidth = Math.pow(newLevel, logFactor);
            $gameConfig.photo_mode.pen.width = Math.min(Math.max(1, newWidth), 400);
        } else if ($gameConfig.photo_mode.tool.type === 'eraser') {
            const level = Math.pow($gameConfig.photo_mode.eraser.width, 1 / logFactor);
            const newLevel = level + event.deltaY * wheelFactor;
            const newWidth = Math.pow(newLevel, logFactor);
            $gameConfig.photo_mode.eraser.width = Math.min(Math.max(1, newWidth), 400);
        }
    }}
    onkeydown={(event) => {
        if (!context.active) return;
        if (event.key === 'e') {
            $gameConfig.photo_mode.tool = {
                type: 'eraser',
            };
        } else if (['p', 'b'].includes(event.key)) {
            $gameConfig.photo_mode.tool = {
                type: 'pen',
            };
        } else if (event.key === 'm') {
            $gameConfig.photo_mode.tool = {
                type: 'move',
            };
        }
    }}
/>

{#if $scene.type === 'photo_mode'}
    <PhotoScreen bind:photoMode={$scene} />
{/if}
