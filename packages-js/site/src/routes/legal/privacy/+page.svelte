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
                    <i class="ti ti-file"></i>
                </h1>
                <small>使っていただける方へお約束</small>
            </FlexColWrapper>
            <img src={robotKilled} alt="robot-reading" />
        </FlexRowWrapper>
    </header>
    <main slot="content">
        <div class="summary">
            <h2>
                わかりやすく3行で言うと（本文はこの下）
            </h2>
            <ul>
                <li>このソフト自体は個人情報は何も取得しないよ</li>
                <li>「アプリを探す」タブ以外から入れるアプリはそれぞれのプライバシーポリシーを確認してね</li>
                <li>あくまでアプリ管理ソフトだから、アプリが何をするかはわからないよ</li>
            </ul>
        </div>
        <h1 id="privacy">プライバシーポリシー</h1>
        <p>2024年8月28日</p>
        <p>
            本アプリケーション（以下「本アプリ」）は、
            ウェブブラウザの機能だけでは作れないプログラムを作るために必要な機能をAPIとして提供するアプリケーションです。
            本アプリを利用するにあたっては、以下のプライバシーポリシーをお読みいただき、
            これに同意いただいた上でご利用ください。
        </p>
        <h2 id="definition">定義</h2>
        <ol>
            <li>
                「本アプリ」とは、本規約に基づいて提供されるアプリケーションを指します。
            </li>
            <li>
                「おむアプリ」とは、本アプリのAPIを利用するアプリケーションを指します。
            </li>
        </ol>
        <h2 id="scope">適応範囲</h2>
        <p>
            本プライバシーポリシーは、本アプリにおいてのみ適用されます。
            おむアプリにおいては、それぞれのアプリのプライバシーポリシーをご確認ください。
        </p>
        <h2 id="personal-information">個人情報の取り扱い</h2>
        <p>
            本アプリは、ユーザーの個人情報を取得しません。
            ただし、おむアプリがユーザーの個人情報を取得する場合があります。
            各アプリのプライバシーポリシーをご確認ください。
        </p>
    </main>
</Page>

<style lang="scss">
    main {
        font-weight: 500;
    }

    .summary {
        border-bottom: 1px solid var(--color-outline);
        padding-bottom: 1rem;
        margin-bottom: 1rem;

        > ul {
            margin-left: 2rem;
        }
    }

    header {
        :global(h1) {
            color: var(--color-1);
        }
    }

    img {
        width: 50%;
        max-width: 16rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
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
