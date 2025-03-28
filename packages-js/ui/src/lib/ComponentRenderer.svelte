<script lang="ts">
    import { content } from '@omujs/chat/models/index.js';
    import LinkableText from './LinkableText.svelte';
    import { client } from './stores.js';
    import Tooltip from './Tooltip.svelte';

    export let component: content.Component;
</script>

{#if component instanceof content.Text}
    <LinkableText text={component.text || ''} />
{:else if component instanceof content.Image}
    <span>
        <Tooltip>
            <div class="flex row gap">
                <div class="flex col">
                    {#if component.name}
                        {component.name}
                    {/if}
                    {#if component.id && component.id !== component.name}
                        <small>
                            {component.id}
                        </small>
                    {/if}
                </div>
                <img src={component.url} alt={component.id} class="preview" />
            </div>
        </Tooltip>
        <img src={component.url} alt={component.id} />
    </span>
{:else if component instanceof content.Asset}
    <span>
        <img src={$client.assets.url(component.id)} alt={component.id.key()} />
    </span>
{:else if component instanceof content.Link}
    <a href={component.url} target="_blank" rel="noopener noreferrer">
        <Tooltip>
            {component.url}
        </Tooltip>
        {#each component.children || [] as sibling, i (i)}
            <svelte:self component={sibling} />
        {/each}
    </a>
{:else if component instanceof content.System}
    <code>
        {#each component.children || [] as sibling, i (i)}
            <svelte:self component={sibling} />
        {/each}
    </code>
{:else if component.isParent()}
    {#each component.children as sibling, i (i)}
        <svelte:self component={sibling} />
    {/each}
{/if}

<style>
    img {
        max-height: 1.5rem;
        vertical-align: middle;
        object-fit: contain;
    }

    code {
        display: flex;
        flex-direction: row wrap;
        gap: 5px;
        align-items: center;
        padding: 5px 10px;
        margin: 5px 0;
        font-weight: bold;
        color: var(--color-1);
        background-color: var(--color-bg-1);
    }

    .preview {
        max-height: 64px;
        padding: 4px;
        vertical-align: middle;
        object-fit: contain;
    }

    .flex {
        display: flex;
    }

    .row {
        flex-direction: row;
    }

    .col {
        flex-direction: column;
    }

    .gap {
        gap: 0.5rem;
    }
</style>
