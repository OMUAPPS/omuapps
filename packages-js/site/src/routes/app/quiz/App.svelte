<script lang="ts">
    import { QuizApp } from './quiz-app';
    import SceneMainMenu from './scenes/SceneMainMenu.svelte';
    import SceneQuizCreate from './scenes/SceneQuizCreate.svelte';
    import SceneQuizList from './scenes/SceneQuizList.svelte';
    import SceneQuizPlay from './scenes/SceneQuizPlay.svelte';

    const quizApp = QuizApp.getInstance();
    const { sceneCurrent, sceneHistory } = quizApp;
</script>

<main>
    {#if $sceneCurrent.type === 'main_menu'}
        <SceneMainMenu />
    {:else if $sceneCurrent.type === 'quiz_list'}
        <SceneQuizList />
    {:else if $sceneCurrent.type === 'quiz_create'}
        <SceneQuizCreate bind:quiz={$sceneCurrent.quiz} />
    {:else if $sceneCurrent.type === 'quiz_play'}
        <SceneQuizPlay bind:state={$sceneCurrent.state} />
    {/if}
    {#if $sceneHistory.length > 0}
        <button onclick={() => quizApp.popScene()}>
            <i class="ti ti-chevron-left"></i>
            戻る
        </button>
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
    }

    button {
        position: absolute;
        left: 0;
        top: 0;
        margin: 2rem;
        padding: 0.5rem 1.5rem;
        padding-left: 1rem;
        background: var(--color-1);
        color: var(--color-bg-2);
        border: none;
        border-radius: 2px;
        cursor: pointer;
    }
</style>
