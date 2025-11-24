<script lang="ts">
    import { Button, ButtonMini, Textbox, Tooltip } from '@omujs/ui';
    import { QuizApp, type QuestionState, type Quiz } from '../quiz-app';
    import EditQuestion from './_components/QuestionEdit.svelte';
    import QuestionRenderer from './_components/QuestionRenderer.svelte';

    export let quiz: Quiz;
    const quizApp = QuizApp.getInstance();
    const { quizzes } = quizApp;

    let state: QuestionState = { type: 'idle' };

    $: quizzes.update(quiz);
</script>

<main>
    <div class="header">
        <h1>クイズをつくる <i class="ti ti-pencil"></i></h1>
    </div>
    <div class="editor omu-scroll">
        <h2>情報</h2>
        <section>

            <p>名前</p>
            <Textbox bind:value={quiz.info.title} />
            <p>説明</p>
            <Textbox bind:value={quiz.info.description} />
        </section>

        {#each quiz.questions as question, index (index)}
            {@const isFirst = index === 0}
            {@const isLast = index === quiz.questions.length - 1}
            <div class="question">
                <h3 class="index">{index + 1} <small>問目</small></h3>
                <div>
                    <span class="actions">
                        <ButtonMini disabled={isFirst} on:click={() => {
                            const former = quiz.questions.filter((_, it) => it < index);
                            const swap = former.pop();
                            if (!swap) return;
                            const latter = quiz.questions.filter((_, it) => it > index);
                            quiz.questions = [
                                ...former,
                                question,
                                swap,
                                ...latter,
                            ];
                        }}>
                            <Tooltip>順番を入れ替える</Tooltip>
                            <i class="ti ti-chevron-up"></i>
                        </ButtonMini>
                        <ButtonMini disabled={isLast} on:click={() => {
                            const former = quiz.questions.filter((_, it) => it < index);
                            const [swap, ...latter] = quiz.questions.filter((_, it) => it > index);
                            quiz.questions = [
                                ...former,
                                swap,
                                question,
                                ...latter,
                            ];
                        }}>
                            <Tooltip>順番を入れ替える</Tooltip>
                            <i class="ti ti-chevron-down"></i>
                        </ButtonMini>
                        <ButtonMini on:click={() => {
                            quiz.questions = quiz.questions.filter((_, it) => it !== index);
                        }}>
                            <Tooltip>削除</Tooltip>
                            <i class="ti ti-trash"></i>
                        </ButtonMini>
                    </span>
                    <EditQuestion bind:question />
                </div>
                <div class="preview">
                    <h2>プレビュー</h2>
                    <QuestionRenderer {question} {index} {state} />
                    <div class="actions">
                        <Button primary={state.type !== 'idle'} onclick={() => {state = { type: 'idle' };}}>
                            待機状態
                        </Button>
                        <i class="ti ti-chevron-right"></i>
                        <Button primary={state.type !== 'qustioning'} onclick={() => {state = { type: 'qustioning' };}}>
                            出題
                        </Button>
                        <i class="ti ti-chevron-right"></i>
                        <Button primary={state.type !== 'answering'} onclick={() => {state = { type: 'answering' };}}>
                            回答
                        </Button>
                    </div>
                </div>
            </div>
        {:else}
            <p>
                問題がありません
                <i class="ti ti-alert-triangle"></i>
            </p>
        {/each}
        <Button onclick={() => {
            quiz.questions = [...quiz.questions, {
                prompt: { type: 'text', body: '' },
                answer: { type: 'choices', choices: [], randomize: false },
                hint: { type: 'text', body: '' },
            }];
        }} primary>
            問題を追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
    }

    .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        justify-content: space-between;
        width: 100%;
        background: var(--color-bg-2);
        padding: 1rem 9rem;
        padding-top: 1.75rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--color-outline);
    }

    .editor {
        padding: 5rem 2rem;
        flex: 1;
    }

    .question {
        position: relative;
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: 4rem;
        background: var(--color-bg-2);
        padding: 1rem;

        > .index {
            position: absolute;
            top: -3rem;
            left: 0;
            color: var(--color-1);
            border-bottom: 2px solid var(--color-1);
            width: fit-content;
            font-size: 1.3rem;
            margin-bottom: 0.5rem;
        }
    }

    .preview {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-1);
        color: #444;
        outline: 1px solid var(--color-outline);
        margin: 2rem;
        margin-bottom: 0;
        margin-top: 0;
        flex: 1;

        > h2 {
            position: absolute;
            left: 0;
            top: 0;
            margin: 2rem;
        }

        > .actions {
            position: absolute;
            left: 0;
            top: 4rem;
            margin: 2rem;
        }
    }

    h1 {
        color: var(--color-1);
    }

    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        width: fit-content;
    }

    section {
        background: var(--color-bg-2);
        padding: 1.75rem 1.5rem;
        padding-right: 2rem;
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: min(26rem, 50%);
    }

    .actions {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }
</style>
