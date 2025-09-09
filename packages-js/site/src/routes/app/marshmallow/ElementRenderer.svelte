<script lang="ts">
    import type { ContentBlock } from './api';

    export let block: ContentBlock | undefined;
</script>

{#if block === undefined}
    /* undefined */
{:else if block.type === 'text'}
    {block.body}
{:else if block.type === 'img'}
    <img src={block.src} alt="">
{:else if block.type === 'block'}
    {#each block.children as child, index (index)}
        <svelte:self block={child} />
    {/each}
{:else}
    /* {JSON.stringify(block)} */
{/if}
