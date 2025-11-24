<script lang="ts">
    import ElementRenderer from './ElementRenderer.svelte';
    import type { ContentBlock } from '../api';

    interface Props {
        block: ContentBlock | undefined;
    }

    let { block }: Props = $props();
</script>

{#if block === undefined}
    /* undefined */
{:else if block.type === 'text'}
    {block.body}
{:else if block.type === 'img'}
    <img src={block.src} alt="">
{:else if block.type === 'block'}
    {#each block.children as child, index (index)}
        <ElementRenderer block={child} />
    {/each}
{:else}
    /* {JSON.stringify(block)} */
{/if}
