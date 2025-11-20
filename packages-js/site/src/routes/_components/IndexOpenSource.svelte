<script lang="ts">
    import opensource from '$lib/images/open-source.png';
    import { Tooltip } from '@omujs/ui';
</script>

<div class="content-width open-source">
    <div class="section-header">
        <h3>
            オープンソース
            <i class="ti ti-code"></i>
        </h3>
        <p>APIと管理画面、そしてサイトを含む全てはオープンソースなので、動いている中身を完全に知ることができます</p>
    </div>
    <div class="image">
        <img src={opensource} alt="Open Source" />
        <a href="https://github.com/omuapps" target="_blank" rel="noopener noreferrer">
            <Tooltip>
                <p>GitHubで開発を見る</p>
            </Tooltip>
            <i class="ti ti-brand-github"></i>
            Githubでコードを見る
            <i class="ti ti-arrow-right"></i>
        </a>
    </div>
</div>

<style lang="scss">
    a {
        margin-top: 1rem;
    }

    .section-header {
        > h3 {
            font-size: 1.5rem;
            border-bottom: 2px solid var(--color-1);
            color: var(--color-1);
            text-align: center;
            padding-bottom: 1rem;
        }

        > p {
            margin-top: 0.75rem;
            padding-bottom: 2rem;
        }
    }
</style>
