<script lang="ts">
    import Page from '$lib/components/Page.svelte';

    import robotKilled from '$lib/images/robot-killed.svg';
</script>

<Page>
    {#snippet header()}
        <header>
            <div class="flex between center">
                <div class="flex col">
                    <h1>
                        プライバシーポリシー
                        <i class="ti ti-file"></i>
                    </h1>
                    <small>使っていただける方へお約束</small>
                </div>
                <img src={robotKilled} alt="robot-reading" />
            </div>
        </header>
    {/snippet}
    {#snippet content()}
        <main>
            <div class="summary">
                <h2>
                    かんたんに3行で言うと（本文はこの下）
                </h2>
                <ul>
                    <li>OMUAPPSは個人情報を外部に送信することなく、すべてあなたのPCの中で動きます</li>
                    <li>OMUAPPS内のアプリ導入機能以外から入れるアプリはそれぞれのプライバシーポリシーを確認してください</li>
                    <li>あくまでアプリ管理ソフトなので、入れたアプリが何をするかは分かりません</li>
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
    {/snippet}
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

    .flex {
        display: flex;
    }

    .col {
        flex-direction: column;
    }

    .between {
        justify-content: space-between;
    }

    .center {
        align-items: center;
    }
</style>
