<script lang="ts">
    import type { Prompt, QuestionState } from '../../quiz-app';
    import AssetRenderer from './AssetRenderer.svelte';

    export let prompt: Prompt;
    export let state: QuestionState = { type: 'idle' };
</script>

<div class="prompt" class:show={state.type === 'qustioning' || state.type === 'answering'}>
    {#if prompt.type === 'text'}
        {#if state.type !== 'idle'}
            <h1>{prompt.body}</h1>
        {/if}
    {:else if prompt.type === 'asset'}
        <div class="assets" style:grid-template-columns="repeat({Math.min(3, prompt.assets.length)}, 1fr)">
            {#each prompt.assets as asset, index (index)}
                <div class="asset">
                    <AssetRenderer {asset} />
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .prompt {
        opacity: 0;

        &.show {
            animation: slide 0.2621s forwards;
        }
    }

    h1 {
        font-size: 2.5em;
        background: var(--color-bg-2);
        padding: 0.5em 1em;
    }

    @keyframes slide {
        0% {
            transform: translateY(80px);
            opacity: 0;
        }
        80% {
            transform: translateY(-4px);
            opacity: 0.9;
        }
        100% {
            transform: translateY(0px);
            opacity: 1;
        }
    }

    .assets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4em;
    }

    .asset {
        width: 10em;
    }
</style>
