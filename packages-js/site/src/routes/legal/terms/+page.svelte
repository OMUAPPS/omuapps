<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { FlexColWrapper, FlexRowWrapper } from '@omujs/ui';

    import robotReading from '$lib/images/robot-reading.svg';
</script>

<Page>
    <header slot="header">
        <FlexRowWrapper between alignItems="center">
            <FlexColWrapper gap>
                <h1>
                    利用規約
                    <i class="ti ti-file" />
                </h1>
                <small>使っていただくにあたって</small>
            </FlexColWrapper>
            <img src={robotReading} alt="robot-reading" />
        </FlexRowWrapper>
    </header>
    <main slot="content">
        <p>現在、利用規約を作成中です。</p>
    </main>
</Page>

<style lang="scss">
    img {
        width: 50%;
        max-width: 16rem;
    }

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
