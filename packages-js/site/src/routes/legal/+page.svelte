<script lang="ts">
    import Page from '$lib/components/Page.svelte';
</script>

<Page>
    <header slot="header">
        <h1>
            法的事項
            <i class="ti ti-file" />
        </h1>
        <small> 使っていただくにあたって </small>
    </header>
    <main slot="content">
        <a href="/legal/privacy">
            <p>
                プライバシーポリシー
                <i class="ti ti-external-link" />
            </p>
        </a>
        <a href="/legal/terms">
            <p>
                利用規約
                <i class="ti ti-external-link" />
            </p>
        </a>
    </main>
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }

    p {
        margin-top: 1rem;
        font-size: 1rem;
    }
</style>
