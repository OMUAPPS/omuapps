<script lang="ts">
    import { Content } from '@omujs/chat/models';
    import LinkableText from './LinkableText.svelte';
    import { client } from './stores.js';
    import Tooltip from './Tooltip.svelte';

    export let component: Content.Component;
</script>

{#if component.type === 'text'}
    <LinkableText text={component.data || ''} />
{:else if component.type === 'image'}
    {@const { id, url, name } = component.data}
    <span>
        <Tooltip>
            <div class="flex row gap">
                <div class="flex col">
                    {#if name}
                        {name}
                    {/if}
                    {#if id && id !== name}
                        <small>
                            {id}
                        </small>
                    {/if}
                </div>
                <img src={url} alt={id} class="preview" />
            </div>
        </Tooltip>
        <img src={url} alt={id} />
    </span>
{:else if component.type === 'asset'}
    {@const { id } = component.data}
    <span>
        <img src={$client.assets.url(id)} alt={id} />
    </span>
{:else if component.type === 'link'}
    {@const { children, url } = component.data}
    <a href={url} target="_blank" rel="noopener noreferrer">
        <Tooltip>
            {url}
        </Tooltip>
        {#each children || [] as sibling, i (i)}
            <svelte:self component={sibling} />
        {/each}
    </a>
{:else if component.type === 'root'}
    {@const children = component.data}
    {#each children || [] as sibling, i (i)}
        <svelte:self component={sibling} />
    {/each}
{:else if component.type === 'system'}
    {@const children = component.data}
    <code>
        {#each children || [] as sibling, i (i)}
            <svelte:self component={sibling} />
        {/each}
    </code>
{:else}
    /* Unknown component {typeof component} {JSON.stringify(component)} */
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
