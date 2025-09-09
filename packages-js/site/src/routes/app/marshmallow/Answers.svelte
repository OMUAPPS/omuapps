<script lang="ts">
    import { Button, Spinner } from '@omujs/ui';
    import { DOM, type AnswerMessage, type MarshmallowAPI } from './api';
    import MessageEntry from './MessageEntry.svelte';

    export let api: MarshmallowAPI;
    export let search: string = '';
    export let refresh = () => {
        last = undefined;
        answers = undefined;
        remaining = true;
        loadNext();
    };

    let answers: Record<string, AnswerMessage> | undefined = undefined;
    let last: AnswerMessage | undefined = undefined;
    let loading = false;
    let remaining = true;

    async function loadNext() {
        if (!remaining) return;
        if (loading) return;
        loading = true;
        const results = await api.answers({
            before: last ? last.iso8601 : new Date(),
        });
        if (results.length === 0) {
            remaining = false;
            loading = false;
            return;
        }
        last = results[results.length - 1].fragment;
        remaining = results.length > 0;
        const newAnswers = Object.fromEntries(
            results.map(({ fragment }) => [fragment.id, fragment]),
        );
        answers = {
            ...answers,
            ...newAnswers,
        };
        loading = false;
        if (Object.keys(answers).length < 20) {
            loadNext();
        }
    }

    $: {
        if (api) {
            refresh();
            loadNext();
        }
    }

    $: filteredAnswers = Object.entries(answers ?? {})
        .sort(([,a], [,b]) => b.iso8601.getTime() - a.iso8601.getTime())
        .filter(([,message]) => {
            if (DOM.blockToString(message.content).toLocaleLowerCase().includes(search.toLocaleLowerCase())) return true;
            if (message.reply && DOM.blockToString(message.reply).toLocaleLowerCase().includes(search.toLocaleLowerCase())) return true;
        });
    $: {
        if (filteredAnswers.length === 0) {
            loadNext();
        }
    }
</script>

<div class="answers omu-scroll" on:scroll={(event) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const remaining = scrollHeight - scrollTop - clientHeight;
    if (remaining < clientHeight) {
        loadNext();
    }
}}>
    {#if filteredAnswers}
        {#each filteredAnswers as [id, message] (id)}
            <MessageEntry {message} />
        {/each}
        {#if !remaining}
            <small>これ以上メッセージはありません</small>
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
    .answers {
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
        display: flex;
        padding-top: 4rem;
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
