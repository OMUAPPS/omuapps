<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { FlexColWrapper, FlexRowWrapper } from '@omujs/ui';

    import robotKilled from '$lib/images/robot-killed.svg';
</script>

<Page>
    <header slot="header">
        <FlexRowWrapper between alignItems="center">
            <FlexColWrapper gap>
                <h1>
                    プライバシーポリシー
                    <i class="ti ti-file" />
                </h1>
                <small>使っていただける方へお約束</small>
            </FlexColWrapper>
            <img src={robotKilled} alt="robot-reading" />
        </FlexRowWrapper>
    </header>
    <main slot="content">
        <p>現在、プライバシーポリシーを作成中です。</p>
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
</style>
