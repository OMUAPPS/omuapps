<script lang="ts">
    import { OmuPermissions } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { QUIZ_ASSET_APP } from '../app';
    import { createQuiz, QuizApp } from '../quiz-app';

    const quizApp = QuizApp.getInstance();
</script>

<main>
    <div class="actions">
        <button on:click={() => quizApp.pushScene({ type: 'quiz_list' })}>
            遊ぶ
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => quizApp.pushScene({ type: 'quiz_create', quiz: createQuiz() })}>
            作る
            <i class="ti ti-pencil"></i>
        </button>
    </div>
    <AssetButton
        asset={QUIZ_ASSET_APP}
        permissions={[
            OmuPermissions.ASSET_PERMISSION_ID,
            OmuPermissions.TABLE_PERMISSION_ID,
        ]}
    />
</main>

<style lang="scss">
    button {
        width: 16rem;
        height: 6rem;
        font-size: 2rem;
        font-weight: 600;
    }

    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items:flex-start;
        justify-content: center;
        padding-left: 10rem;
    }

    .actions {
        display: flex;
        gap: 2rem;
    }

    button {
        border: none;
        background: var(--color-1);
        color: var(--color-bg-2);
    }
</style>
