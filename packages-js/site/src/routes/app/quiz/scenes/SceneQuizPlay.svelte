<script lang="ts">
    import { Button } from '@omujs/ui';
    import { QuizApp, type PlayState } from '../quiz-app';
    import QuizPlayQuestion from './_components/QuizPlayQuestion.svelte';

    export let state: PlayState;
    const quizApp = QuizApp.getInstance();
</script>

<main>
    {#if state.type === 'idle'}
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
    {:else if state.type === 'play'}
        {#if state.index < state.quiz.questions.length}
            <QuizPlayQuestion
                question={state.quiz.questions[state.index]}
                bind:index={state.index}
                bind:state={state.state}
            />
        {:else}
            aaaa
        {/if}
    {/if}
</main>

<style lang="scss">
</style>
