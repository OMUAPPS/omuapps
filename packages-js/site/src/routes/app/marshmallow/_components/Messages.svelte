<script lang="ts">
    import { Button, Spinner } from '@omujs/ui';
    import { DOM, type MarshmallowAPI, type Message } from '../api';
    import MessageEntry from './MessageEntry.svelte';

    export let api: MarshmallowAPI;
    export let search: string = '';
    export let messages: Record<string, Message> | undefined = undefined;
    export let refresh = () => {
        page = 1;
        messages = undefined;
        remaining = true;
        loadNext();
    };

    let page = 1;
    let loading = false;
    let remaining = true;

    async function loadNext() {
        if (!remaining) return;
        if (loading) return;
        loading = true;
        const newMessages = await api.messages({
            page,
        });
        messages = {
            ...messages,
            ...Object.fromEntries(newMessages.map(m => [m.id, m])),
        };
        remaining = newMessages.length > 0;
        if (newMessages.length > 0) {
            page++;
        }
        loading = false;
    }

    $: {
        if (api) {
            refresh();
            loadNext();
        }
    }

    $: filteredEntries = Object.entries(messages ?? {}).filter(([,message]) => DOM.blockToString(message.content).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    $: {
        if (filteredEntries.length === 0) {
            loadNext();
        }
    }
</script>

<div class="messages omu-scroll" on:scroll={(event) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const remaining = scrollHeight - scrollTop - clientHeight;
    if (remaining < clientHeight) {
        loadNext();
    }
}}>
    {#if messages}
        {#each filteredEntries as [id, message] (id)}
            <MessageEntry {message} />
        {/each}
        {#if !remaining}
            <small>
                {#if filteredEntries.length > 0}
                    これ以上マシュマロはありません
                {:else}
                    まだマシュマロが届いていないようです
                {/if}
            </small>
            <Button primary onclick={refresh}>
                <i class="ti ti-reload"></i>
                再読込する
            </Button>
        {/if}
    {/if}
    {#if loading}
        <div class="loading">
            <Spinner />
            読み込み中...
        </div>
    {/if}
</div>

<style lang="scss">
    .messages {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        overflow-y: auto;
        height: 100%;
        padding: 1rem;
        padding-top: 4rem;
        padding-bottom: 10rem;
    }

    .loading {
        padding-top: 4rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        align-self: center;
        color: var(--color-1);
    }

    small {
        color: var(--color-1);
    }
</style>
