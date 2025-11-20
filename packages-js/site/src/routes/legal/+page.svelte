<script lang="ts">
    import Page from '$lib/components/Page.svelte';
</script>

<Page>
    {#snippet header()}
        <header>
            <h1>
                法的事項
                <i class="ti ti-file"></i>
            </h1>
            <small> 使っていただくにあたって </small>
        </header>
    {/snippet}
    {#snippet content()}
        <main>
            <a href="/legal/privacy">
                <p>
                    プライバシーポリシー
                    <i class="ti ti-external-link"></i>
                </p>
            </a>
            <a href="/legal/terms">
                <p>
                    利用規約
                    <i class="ti ti-external-link"></i>
                </p>
            </a>
        </main>
    {/snippet}
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
