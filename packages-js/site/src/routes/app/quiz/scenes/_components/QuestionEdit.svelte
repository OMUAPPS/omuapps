<script lang="ts">
    import type { Question } from '../../quiz-app';
    import EditAnswer from './AnswerEdit.svelte';
    import EditPrompt from './PromptEdit.svelte';

    interface Props {
        question: Question;
    }

    let { question = $bindable() }: Props = $props();
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
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--color-1);
        color: var(--color-1);
        font-size: 1.3621rem;
        width: 100%;
        text-align: center;
        margin-top: 2rem;

        &:not(&:first-child) {
            margin-top: 4rem;
        }
    }

    section {
        background: var(--color-bg-2);
        padding: 1rem;
    }
</style>
