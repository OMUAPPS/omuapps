<script lang="ts">
    import type { Question, QuestionState } from '../../quiz-app';
    import AnswerRenderer from './AnswerRenderer.svelte';
    import HintRenderer from './HintRenderer.svelte';
    import PromptRenderer from './PromptRenderer.svelte';

    export let question: Question;
    export let index: number;
    export let state: QuestionState = { type: 'idle' };
</script>

<div class="question">
    <h2 class:big={state.type === 'idle'}>第{index + 1}問</h2>
    <div class="prompt">
        <PromptRenderer prompt={question.prompt} {state} />
    </div>
    <div class="answers">
        <AnswerRenderer answer={question.answer} {state} />
    </div>
    <div class="hint">
        <HintRenderer hint={question.hint} />
    </div>
</div>

<style lang="scss">
    h2 {
        margin-bottom: 2em;
        height: fit-content;
        font-size: 1em;
        font-weight: 400;
        background: var(--color-bg-2);
        padding: 0.5em 1em;

        &.big {
            font-size: 2em;
            font-weight: 700;
            opacity: 1;
        }
    }

    .prompt {
        margin-bottom: 4em;
        background: var(--color-bg-2);
        padding: 0.5em 1em;
    }

    .question {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
</style>
