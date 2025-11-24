<script lang="ts">
    import { Button, chat } from '@omujs/ui';
    import { QuizApp, type AnswerEntry, type PlayState } from '../quiz-app';
    import QuizPlayQuestion from './_components/QuizPlayQuestion.svelte';
    import { ChatEvents } from '@omujs/chat';

    export let state: PlayState;
    const quizApp = QuizApp.getInstance();
    const { sceneCurrent, answers } = quizApp;

    $chat.on(ChatEvents.Message.AddBatch, async (messages) => {
        if (state.type === 'idle') return;
        const { quiz } = state;
        const question = quiz.questions[state.index];
        const authors = Object.fromEntries(messages.entries()
            .filter(([,message]) => message.authorId)
            .map(([id, message]) => {
                return [message.authorId!.key(), message];
            }),
        );
        const existing = Object.fromEntries((await answers.getMany(...Object.keys(authors))).entries());
        for (const message of messages.values()) {
            if (!message.authorId) continue;
            const id = message.authorId.key();
            const entry = existing[id] = {
                id,
                answers: existing[id]?.answers ?? [],
            };
            entry.answers[state.index] = '';
        }
    });
</script>

<main>
    {#if state.type === 'idle'}
        <div class="menu">
            <div class="actions">
                <Button onclick={() => {
                    state = {
                        type: 'play',
                        state: { type: 'idle' },
                        quiz: state.quiz,
                        index: 0,
                    };
                }} primary>
                    スタート
                </Button>
            </div>
        </div>
        <div class="info">
            <h1>{state.quiz.info.title}</h1>
            <small>{state.quiz.info.description}</small>
        </div>
    {:else if state.type === 'play'}
        {#if state.index < state.quiz.questions.length}
            <QuizPlayQuestion
                question={state.quiz.questions[state.index]}
                bind:index={state.index}
                bind:state={state.state}
            />
        {:else}
            <div class="menu">
                <div class="actions">
                    <Button onclick={() => {
                        quizApp.popScene();
                    }} primary>
                        終わる
                    </Button>
                </div>
            </div>
            <div class="info">
                <h1>{state.quiz.info.title}</h1>
                <small>{state.quiz.info.description}</small>
            </div>
        {/if}
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: stretch;
        justify-content: space-between;
    }

    .menu {
        background: var(--color-bg-2);
        width: 20rem;
        outline: 1px solid var(--color-outline);
        margin: 2rem;
        margin-top: 6rem;
        display: flex;
    }

    .info {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
    }

    .actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-top: auto;
        border-top: 1px solid var(--color-outline);
        padding: 1rem;
        padding-bottom: 4rem;
        flex: 1;
    }
</style>
