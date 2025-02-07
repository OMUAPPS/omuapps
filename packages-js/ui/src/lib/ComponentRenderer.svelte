<script lang="ts">
    import { content } from '@omujs/chat/models/index.js';
    import FlexColWrapper from './FlexColWrapper.svelte';
    import FlexRowWrapper from './FlexRowWrapper.svelte';
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
            <FlexRowWrapper alignItems="center" gap>
                <FlexColWrapper>
                    {#if component.name}
                        {component.name}
                    {/if}
                    {#if component.id && component.id !== component.name}
                        <small>
                            {component.id}
                        </small>
                    {/if}
                </FlexColWrapper>
                <img src={component.url} alt={component.id} class="preview" />
            </FlexRowWrapper>
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
        {#each component.children || [] as sibling}
            <svelte:self component={sibling} />
        {/each}
    </a>
{:else if component instanceof content.System}
    <code>
        {#each component.children || [] as sibling}
            <svelte:self component={sibling} />
        {/each}
    </code>
{:else if component.isParent()}
    {#each component.children as sibling}
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
</style>
