<script lang="ts">
    import Page from '$lib/components/Page.svelte';
</script>

<Page>
    <header slot="header">
        <h1>
            プライバシーポリシー
            <i class="ti ti-file" />
        </h1>
        <small> 使ってもらえる方へのお約束 </small>
    </header>
    <main slot="content">
        <p>現在、プライバシーポリシーを作成中です。</p>
    </main>
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: 2rem;
    }

    p {
        margin-top: 1rem;
        font-size: 1rem;
    }

    ol {
        margin-top: 1rem;
        margin-left: 2rem;
    }

    li {
        margin-top: 0.5rem;
    }
</style>
