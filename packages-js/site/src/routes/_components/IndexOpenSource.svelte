<script lang="ts">
    import opensource from '$lib/images/open-source.png';
    import { Tooltip } from '@omujs/ui';
</script>

<div class="content-width open-source">
    <div class="image">
        <img src={opensource} alt="Open Source" />
    </div>
    <div class="info">
        <i class="ti ti-code"></i>
        <div class="info">
            <h3>オープンソース</h3>
            <p>APIと管理画面、そしてサイトを含む全てはオープンソースなので、誰でも中身を見ることが出来ます。</p>
        </div>
    </div>
    <a href="https://github.com/omuapps" target="_blank" rel="noopener noreferrer">
        <Tooltip>
            <p>GitHubで開発を見る</p>
        </Tooltip>
        <i class="ti ti-brand-github"></i>
        Github
        <i class="ti ti-arrow-right"></i>
    </a>
</div>

<style lang="scss">
    .open-source {
        position: relative;
        height: 40rem;

        > .info {
            top: 0;
            right: 0;
            position: absolute;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 2rem;
            padding: 1rem 2rem;
            background: var(--color-bg-2);
            border: 1px solid var(--color-1);
            outline: 0.25rem solid var(--color-bg-2);
            margin-bottom: 2rem;
    
            > i {
                font-size: 2rem;
                color: var(--color-1);
            }
    
            > .info {
                display: flex;
                flex-direction: column;
                width: 20rem;
    
                > h3 {
                    color: var(--color-1);
                    font-size: 1.5rem;
                    white-space: nowrap;
                }
    
                > p {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-text);
                }
            }
        }

        > .image {
            position: absolute;
            top: 4rem;
            left: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            width: calc(100% - 4rem);
            height: 12rem;

            > img {
                display: block;
                width: 100%;
                object-fit: cover;
                border-radius: 0.5rem;
                box-shadow: 0.25rem 0.5rem 1rem var(--color-outline);
                width: 100%;
                height: 100%;
            }
        }
    }
</style>
