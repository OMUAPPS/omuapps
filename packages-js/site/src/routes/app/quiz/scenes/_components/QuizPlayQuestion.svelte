<script lang="ts">
    import { Button } from '@omujs/ui';
    import type { Question, QuestionState } from '../../quiz-app';
    import QuestionRenderer from './QuestionRenderer.svelte';

    interface Props {
        state: QuestionState;
        question: Question;
        index: number;
    }

    let { state = $bindable(), question, index = $bindable() }: Props = $props();
</script>

<main>
    <div class="menu">
        <div class="actions">
            {#if state.type === 'idle'}
                <Button primary onclick={() => {state = { type: 'qustioning' };}}>
                    出題
                    <i class="ti ti-chevron-right"></i>
                </Button>
            {:else if state.type === 'qustioning'}
                <Button primary onclick={() => {state = { type: 'answering' };}}>
                    正誤発表
                    <i class="ti ti-chevron-right"></i>
                </Button>
            {:else if state.type === 'answering'}
                <Button primary onclick={() => {
                    index ++;
                    state = { type: 'idle' };
                }}>
                    次へ
                    <i class="ti ti-chevron-right"></i>
                </Button>
            {/if}
        </div>
    </div>
    <div class="question">
        <QuestionRenderer {question} {index} {state} />
    </div>
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

    .question {
        display: flex;
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
