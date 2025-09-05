<script lang="ts">
    import { content } from '@omujs/chat/models';
    import { Tooltip } from '@omujs/ui';
    import AddComponent from './AddComponent.svelte';
    import ImageEdit from './ImageEdit.svelte';
    import TextEdit from './TextEdit.svelte';

    export let component: content.Component;
    export let remove: () => void;

    const icons = {
        text: 'ti ti-txt',
        image: 'ti ti-photo',
    };
    $: icon = component && icons[component.type as 'text' | 'image'];

    function removeChild(child: content.Component) {
        const children = content.children(component);
        const index = children.findIndex((it) => it === child);
        children.splice(index);
    }
</script>

{#if component}
    {@const children = content.children(component)}
    {#if icon}
        <button on:click={remove}>
            <Tooltip>コンポーネントを削除</Tooltip>
            <i class={icon}></i>
        </button>
    {/if}
    {#if component.type === 'text'}
        <TextEdit bind:component />
    {:else if component.type === 'image'}
        <ImageEdit bind:component />
    {/if}
    {#if children.length > 0}
        <div>
            {#each children as child, i (i)}
                <svelte:self
                    bind:component={child}
                    remove={() => removeChild(child)}
                />
            {/each}
            <AddComponent bind:component />
        </div>
    {/if}
{:else}
    <AddComponent bind:component />
{/if}

<style lang="scss">
    i {
        width: 24px;
        height: 24px;
        padding: 4px;
    }

    div {
        display: flex;
        flex-wrap: wrap;
    }

    button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin: 0 1px;
        border-radius: 5px;
        color: var(--color-1);

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }
</style>
