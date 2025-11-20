<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { Tooltip } from '@omujs/ui';

    import robotReading from '$lib/images/robot-reading.svg';
</script>

<Page>
    {#snippet header()}
        <header>
            <div class="flex between center">
                <div class="flex col">
                    <h1>
                        利用規約
                        <i class="ti ti-file"></i>
                    </h1>
                    <small>使っていただくにあたって</small>
                </div>
                <img src={robotReading} alt="robot-reading" />
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
                    <li>個人・法人・収益問わず利用可能</li>
                    <li>クレジット表記は不要</li>
                    <li>紹介する場合は必ずクレジット表記が必須</li>
                </ul>
            </div>
            <h1 id="terms">利用規約</h1>
            <p>2024年8月28日</p>
            <p>
                本アプリケーション（以下「本アプリ」）は、
                ウェブブラウザの機能だけでは作れないプログラムを作るために必要な機能をAPIとして提供するアプリケーションです。
                本アプリを利用するにあたっては、以下の利用規約をお読みいただき、
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
            <h2 id="credit">クレジット表記について</h2>
            <p>
                本アプリを使用いただく場合、
                <b>個人・法人問わず原則クレジット表記は不要</b>ですが、
                本アプリの認知度向上のために使用される場合は、
                確認ができ見落としにくい概要欄などの箇所に以下のような表記をお願いいたします。
                <br />
                <code>
                    配信者と視聴者をつなぐアプリ、OMUAPPS。https://omuapps.com
                    <button
                        onclick={() =>
                            navigator.clipboard.writeText(
                                '配信者と視聴者をつなぐアプリ、OMUAPPS。https://omuapps.com',
                            )}
                    >
                        <Tooltip>クリップボードにコピー</Tooltip>
                        <i class="ti ti-copy"></i>
                    </button>
                </code>
            </p>
            <h2 id="omuapp">おむアプリについて</h2>
            <p>
                本規約は、おむアプリについては適用されません。
                おむアプリについては、各おむアプリの利用規約に従ってご利用ください。
            </p>
            <h2 id="license">許諾内容</h2>
            <ol>
                <li>個人・法人問わず無償で利用することができます</li>
                <li>
                    広告費が発生する場合などの収益が発生するかを問わず利用することができます
                </li>
            </ol>
            <h2 id="prohibited">禁止事項</h2>
            <ol>
                <li>
                    本アプリの全てまたは一部を無断で個人又は不特定多数に再配布する行為
                    <small>
                        (安全のため、必ず公式ダウンロードページまたはアプリ内の更新機能を利用してください)
                    </small>
                </li>
            </ol>
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

    code {
        display: block;
        margin-top: 1rem;
        background: var(--color-bg-1);
        padding: 0.5rem 1rem;
        width: fit-content;

        button {
            margin-left: 1rem;
            padding: 0.25rem 0.5rem;
            background: var(--color-bg-2);
            color: var(--color-1);
            font-weight: bold;
            font-size: 0.8rem;
            border: 1px solid var(--color-outline);
            cursor: pointer;
            white-space: nowrap;
        }
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
