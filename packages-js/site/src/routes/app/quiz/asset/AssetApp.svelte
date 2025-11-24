<script lang="ts">
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { QuizApp } from '../quiz-app';
    import QuestionRenderer from '../scenes/_components/QuestionRenderer.svelte';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const quizApp = QuizApp.create(omu);
    const { sceneCurrent } = quizApp;
    sceneCurrent.subscribe((value) => {
        console.log(value);
    });
    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<main>
    {#if $sceneCurrent.type === 'quiz_play'}
        {@const { quiz } = $sceneCurrent.state}
        {#if $sceneCurrent.state.type === 'idle'}
            <div class="title">
                <h1>{quiz.info.title}</h1>
                <small>{quiz.info.description}</small>
            </div>
        {:else if $sceneCurrent.state.type === 'play'}
            {@const { state } = $sceneCurrent}
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

    .title {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.5em 2em;
        background: var(--color-bg-2);
        font-size: 30px;
    }

    h1 {
        font-size: 3em;
    }

    small {
        font-size: 1.5em;
    }
</style>
