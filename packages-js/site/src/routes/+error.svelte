<script lang="ts">
    import { page } from '$app/stores';
    const error = ({
        404: {
            title: 'Not Found',
            detail: 'ページが見つかりませんでした',
        },
        500: {
            title: 'Internal Server Error',
            detail: 'サーバーで問題が発生しました',
        },
    })[$page.status] || {
        title: 'Error',
        detail: '予期しないエラーが発生しました',
    };
</script>

<main>
    <h1>
        {error.title}
    </h1>
    <small>
        {error.detail}
    </small>
    <a href="/">
        最初に戻る
        <i class="ti ti-external-link"></i>
    </a>
</main>


<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-bottom: 12%;
    }

    h1 {
        color: var(--color-1);
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 0.5rem;
    }

    small {
        margin-bottom: 1rem;
    }
</style>
