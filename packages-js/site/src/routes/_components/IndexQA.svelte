<script lang="ts">
</script>

<h3>Q&A</h3>

<h4>Q. OMUAPPSは無料で使えますか？</h4>
<section>
    <h4>A. はい。</h4>
    <p>
        OMUAPPSは完全に無料で使用できます。追加料金やサブスクリプションはありません。
        ただのアプリ管理ツールです。
    </p>
</section>

<h4>Q. OMUAPPSはどのプラットフォームで利用できますか？</h4>
<section>
    <h4>A. 現在は<b>Windowsのみ</b>で利用できます</h4>
    <p>
        将来的にはmacOSやLinuxにも対応する予定ですが、現時点ではWindows版のみ提供しています。
    </p>
</section>

<h4>Q. OMUAPPSで利用できるアプリはすべて安全ですか？</h4>
<section>
    <h4>A. 必ずしもそうとは限りません。</h4>
    <p>OMUAPPSが提供する「公式アプリ」は安全ですが、第三者が作成した未確認のアプリも利用可能です。</p>
    <p>ここで、一般的なアプリと決定的に異なる点があります。OMUAPPSでは、アプリがどのようなシステム機能（例：ファイルへのアクセス、ネット通信など）を使用するかを、アプリが使う前に確認できます。</p>
    <p>しかし、どのように機能を使うかを知ることができない限り、最終的にそのアプリを信頼してインストールするかどうかの判断は、ユーザー自身に委ねられています。この仕組みはセキュリティについて意識するきっかけとなることを願って設計されています。</p>
    <p><b>アプリを信用するのはあなたです</b>。</p>
</section>

<h4>Q. APIとは何ですか？</h4>
<section>
    <h4>A. APIとはソフトウェア同士が互いに通信し、機能を利用するための仕組みです。</h4>
    <p>
        OMUAPPSのAPIは、アプリが配信ソフトウェアや配信プラットフォームと連携するための手段を提供します。
        例えば、OBS上の表示とアプリを同期したり、配信中の視聴者数を取得したり、チャットメッセージを取得したりすることができます。
        これにより、アプリは配信体験を向上させるための様々な機能を実現できます。
    </p>
</section>

<style lang="scss">
    h3 {
        font-size: 4rem;
        color: var(--color-1);
        margin-top: 10rem;
        margin-bottom: 4rem;
    }

    section {
        background: var(--color-bg-2);
        padding: 1.75rem 2rem;
        margin-bottom: 6rem;
    }

    h4 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: var(--color-1);
    }

    p {
        font-size: 0.9rem;
    }

    b {
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
    }
</style>
