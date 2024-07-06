<script lang="ts">
    import Page from '$lib/components/Page.svelte';
</script>

<Page>
    <header slot="header">
        <h1>
            利用規約
            <i class="ti ti-file" />
        </h1>
        <small> 使っていただくにあたって </small>
    </header>
    <main slot="content">
        <p>現在、利用規約を作成中です。</p>
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
