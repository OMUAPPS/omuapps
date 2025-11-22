<script lang="ts">
    import { run } from 'svelte/legacy';

    import Tooltip from './Tooltip.svelte';

    interface Props {
        text: string;
    }

    let { text }: Props = $props();

    interface Part {
        type: 'text' | 'url';
        content: string;
    }

    let parts: Part[] = $state([]);

    run(() => {
        parts = text.split(/(https?:\/\/[^()\s]+)/g).map((part) => {
            if (part.startsWith('http')) {
                return {
                    type: 'url',
                    content: part,
                };
            } else {
                return {
                    type: 'text',
                    content: part,
                };
            }
        });
    });
</script>

{#each parts as part, i (i)}
    {#if part.type === 'text'}
        {part.content}
    {:else if part.type === 'url'}
        <a href={part.content} target="_blank" rel="noopener noreferrer">
            {part.content}
            <i class="ti ti-external-link"></i>
            <Tooltip>
                {part.content}
            </Tooltip>
        </a>
    {/if}
{/each}
