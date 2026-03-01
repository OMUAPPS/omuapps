<script lang="ts">
    import opensource from '$lib/images/open-source.png';
    import { Tooltip } from '@omujs/ui';
</script>

<section class="content-width open-source">
    <img src={opensource} alt="Open Source" />
    <div class="section-header">
        <h3>
            オープンソース
            <i class="ti ti-code"></i>
        </h3>
        <p>APIと管理画面、そしてサイトを含む全てはオープンソースなので、動いている中身を完全に知ることができます</p>
    </div>
    <div class="image">
        <a href="https://github.com/omuapps" target="_blank" rel="noopener noreferrer">
            <Tooltip>
                <p>GitHubで開発を見る</p>
            </Tooltip>
            <i class="ti ti-brand-github"></i>
            Githubでコードを見る
            <i class="ti ti-arrow-right"></i>
        </a>
    </div>
</section>

<style lang="scss">
    section {
        position: relative;
        margin-top: 9rem;
        width: 100%;
    }

    a {
        margin-top: 1rem;
    }

    .section-header {
        > h3 {
            font-size: 2em;
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

    img {
        position: absolute;
        top: -5rem;
        height: 20rem;
        width: 100%;
        object-fit: cover;
        mask-image: radial-gradient(
            ellipse 50% 50% at 50% 50%,
            rgba(0, 0, 0, 1) 60%,
            rgba(0, 0, 0, 0) 100%
        );
        z-index: -1;
        opacity: 0.3;
        filter: blur(0.1rem);
    }
</style>
