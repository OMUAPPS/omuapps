<script lang="ts">
    import { Button, Checkbox } from '@omujs/ui';
    import { QuizApp, type Quiz } from '../../quiz-app';
    import { selectedQuizzes } from '../stores';

    const quizApp = QuizApp.getInstance();
    const { quizzes } = quizApp;

    export let entry: Quiz;
</script>

<div class="entry">
    <Button onclick={async () => {
        quizApp.pushScene({
            type: 'quiz_play',
            state: { type: 'idle', quiz: entry },
        });
    }} primary>
        あそぶ
        <i class="ti ti-player-play"></i>
    </Button>
    <Checkbox bind:value={$selectedQuizzes[entry.id]} />
    <div class="info">
        <p>{entry.info.title}</p>
        <small>{entry.info.description}</small>
    </div>
    <div class="actions">
        <Button onclick={async () => {
            await quizzes.remove(entry);
        }} primary>
            削除
            <i class="ti ti-x"></i>
        </Button>
        <Button onclick={async () => {
            quizApp.pushScene({ type: 'quiz_create', quiz: entry });
        }} primary>
            編集
            <i class="ti ti-pencil"></i>
        </Button>
    </div>
</div>

<style lang="scss">
    .entry {
        display: flex;
        align-items: center;
        gap: 2rem;
        background: var(--color-bg-2);
        padding: 2rem;

        > .info {
            > p {
                font-size: 1.5rem;
                color: var(--color-1);
            }
        }

        > .actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-left: auto;
        }

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -0.5rem;
        }
    }
</style>
