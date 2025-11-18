<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { QuizApp } from '../quiz-app';
    import QuestionRenderer from '../scenes/_components/QuestionRenderer.svelte';

    export let omu: Omu;
    const quizApp = QuizApp.create(omu);
    const { sceneCurrent } = quizApp;
    sceneCurrent.subscribe((value) => {
        console.log(value);
    });
    if (BROWSER) {
        omu.start();
    }
</script>

<main>
    {#if $sceneCurrent.type === 'quiz_play'}
        {#if $sceneCurrent.state.type === 'play'}
            {@const { state } = $sceneCurrent}
            {@const { quiz } = state}
            {#if state.index < quiz.questions.length}
                <QuestionRenderer
                    question={quiz.questions[state.index]}
                    index={state.index}
                    state={state.state}
                />
            {/if}
        {/if}
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
    }
</style>
