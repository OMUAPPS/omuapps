<script lang="ts">
    import Content from '$lib/components/Content.svelte';
    import Page from '$lib/components/Page.svelte';

    const lastUpdated = '2025年4月20日';
</script>

<Page>
    {#snippet header()}
        <Content>
            <header>
                <div>
                    <h1>
                        出力したデータの取り扱いについて
                        <i class="ti ti-file-text"></i>
                    </h1>
                    <small>データの配布・販売・共有ガイドライン</small>
                </div>
            </header>
        </Content>
    {/snippet}

    {#snippet content()}
        <main>
            <Content>
                <div class="summary">
                    <h2>
                        特に重要なポイント
                    </h2>
                    <ul>
                        <li>出力したデータは、<strong>自由な配布・販売が可能</strong>です。</li>
                        <li>
                            配布・販売前に必ず
                            <a href="/legal/terms">
                                OMUAPPS利用規約
                            </a>
                            を再確認してください。
                        </li>
                        <li><strong>第三者の権利（イラストやロゴ等）</strong>を含んでいる場合、その権利元の許可が必要です。</li>
                        <li>販売・配布によって生じたトラブルについて、OMUAPPSは一切の責任を負いません。</li>
                    </ul>
                </div>

                <h1 id="privacy">出力データの配布・販売ガイドライン</h1>
                <p class="date">最終更新日：{lastUpdated}</p>

                <p>
                    OMUAPPS公式アプリで出力したデータは、個人間での共有、SNSでの公開、または<a href="https://booth.pm/" target="_blank" rel="noopener noreferrer">Booth</a>等のプラットフォームを用いた販売が可能です。
                    ただし、権利保護やトラブル防止のため、以下のガイドラインを遵守してください。
                </p>

                <h2 id="definition">1. 定義</h2>
                <ol>
                    <li>
                        <strong>「出力データ」</strong>：
                        『マシュマロ読み』の着せ替えデータ、『配信喫茶』のゲームデータ書き出し機能など、OMUAPPS公式アプリ内の機能を通じて生成・保存されたファイルを指します。
                    </li>
                    <li>
                        <strong>「共有・販売」</strong>：
                        インターネット上へのアップロード、不特定多数への配布、第三者への送信、およびこれらを用いた有償取引を指します。
                    </li>
                </ol>

                <h2 id="rules">2. 遵守事項と注意点</h2>
                <ol>
                    <li>
                        <strong>利用規約の遵守</strong>：
                        配布・販売にあたっては、本ガイドラインに加え
                        <a href="/legal/terms">OMUAPPS共通利用規約</a>
                        が適用されます。公序良俗に反する使用や、サービスのイメージを著しく損なう形での配布は禁止します。
                    </li>
                    <li>
                        <strong>権利関係の確認</strong>：
                        データ内に自分以外の第三者が作成したコンテンツ（画像、音声、フォント等）が含まれる場合、その再配布が許可されているか必ず確認してください。
                        <p class="sub-note">※権利元の許可なしに第三者のコンテンツを配布・販売することは、著作権侵害となる可能性があります。</p>
                    </li>
                    <li>
                        <strong>非公式アプリについて</strong>：
                        OMUAPPSのAPIを利用した非公式（サードパーティ製）アプリの場合は、そのアプリ独自の規約が優先されます。各アプリの規約に従ってください。
                    </li>
                </ol>

                <h2 id="disclaimer">3. 免責事項</h2>
                <p>
                    出力データの配布・販売に関して発生した利用者間、または利用者と第三者との間のトラブル（著作権侵害、データの不具合等）について、OMUAPPS（および開発者）は一切の責任を負いかねます。すべて自己責任において実施してください。
                </p>
            </Content>
        </main>
    {/snippet}
</Page>

<style lang="scss">
    main {
        font-weight: 500;
        line-height: 1.7;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        :global(h1) {
            color: var(--color-1);
            font-size: 2rem;
            font-weight: 600;
            margin: 0;
        }

        small {
            font-size: 1rem;
            opacity: 0.8;
        }
    }

    .summary {
        margin-bottom: 2rem;

        h2 {
            margin-top: 0;
            font-size: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--color-primary);
        }

        ul {
            margin-left: 1.5rem;
            margin-top: 1rem;

            li {
                margin-top: 0.5rem;
                strong {
                    padding: 2px;
                }
            }
        }
    }

    h1 {
        font-size: 1.75rem;
        font-weight: 600;
        margin-top: 3rem;
    }

    h2 {
        font-size: 1.4rem;
        font-weight: 600;
        margin-top: 2.5rem;
        border-bottom: 1px solid var(--color-outline);
        padding-bottom: 0.5rem;
    }

    p {
        margin-top: 1rem;
    }

    .date {
        text-align: right;
        font-size: 0.9rem;
        color: var(--color-text);
    }

    .sub-note {
        font-size: 0.9rem;
        color: var(--color-text);
        margin-top: 0.5rem;
        padding-left: 1rem;
    }

    ol {
        margin-top: 1rem;
        margin-left: 1.5rem;
    }

    li {
        margin-top: 0.75rem;
    }
</style>
