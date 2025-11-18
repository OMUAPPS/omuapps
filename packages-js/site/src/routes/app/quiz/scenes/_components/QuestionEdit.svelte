<script lang="ts">
    import type { Question } from '../../quiz-app';
    import EditAnswer from './AnswerEdit.svelte';
    import EditPrompt from './PromptEdit.svelte';

    export let question: Question;
</script>

<div class="question">
    <h4>問題</h4>
    <section>
        <EditPrompt bind:prompt={question.prompt} />
    </section>
    <h4>回答</h4>
    <section>
        <EditAnswer bind:answer={question.answer} />
    </section>
</div>

<style lang="scss">
    .question {
        width: 24rem;
        &:not(&:last-child) {
            padding-bottom: 4rem;
            border-bottom: 1px solid var(--color-1);
        }
    }

    h4 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid var(--color-1);
        color: var(--color-1);
        width: 25%;
    }

    section {
        background: var(--color-bg-2);
        padding: 1rem;
    }
</style>
