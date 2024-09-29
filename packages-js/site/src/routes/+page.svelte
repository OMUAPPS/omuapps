<script lang="ts">
    import Content from '$lib/components/Content.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import Header from '$lib/components/Header.svelte';
    import background from '$lib/images/background.png';
    import dashboard1 from '$lib/images/dashboard-1.png';
    import indev from '$lib/images/in-dev.png';
    import opensource from '$lib/images/open-source.png';
    import title from '$lib/images/title.svg';
    import { Tooltip } from '@omujs/ui';
    import IndexFeatures from './_components/IndexFeatures.svelte';
    import IndexLinks from './_components/IndexLinks.svelte';
    console.log(       'aa'  ); // 何もフォーマットされない
</script>

<svelte:head>
    <title>OMUAPPS - 配信者と視聴者をつなぐAPI</title>
    <meta name="description" content="配信者と視聴者をつなぐAPI" />
</svelte:head>

<img src={background} alt="background" class="background" />
<Header />
<main>
    <header class="content-width">
        <div class="left">
            <img src={title} class="title" alt="title" />
            <p class="info">配信者と視聴者をつなぐAPI。</p>
            <img src={indev} class="in-dev" alt="in-dev" />
            
            <div class="download">
                <small>
                    現在ベータ版が公開されています！
                </small>
                <a href="/download">
                    <Tooltip>
                        <p>アプリを動かすための手順を見る</p>
                    </Tooltip>
                    <i class="ti ti-download" />
                    <p>ダウンロード</p>
                </a>
            </div>
        </div>
        <div class="right">
            <IndexLinks />
        </div>
    </header>
    <hr>
    <div class="content-width card-container">
        <div class="left">
            <div class="information">
                <div class="info">
                    <h3>
                        ブラウザ上のアプリを使いやすく
                    </h3>
                    <p>
                        ブラウザだけでは作れないアプリがたくさんあります。
                        OMUAPPSは、ブラウザ向けに作りながら、より多くの機能を使えるようにするためのAPIを提供します。
                    </p>
                </div>
            </div>
            <IndexFeatures />
        </div>
        <div class="right">
            <img src={dashboard1} class="dashboard" alt="dashboard" />
        </div>
    </div>
    <hr>
    <div class="content-width open-source">
        <div class="image">
            <img src={opensource} alt="Open Source" />
        </div>
        <div class="info">
            <i class="ti ti-code" />
            <div class="info">
                <h3>オープンソース</h3>
                <p>APIと管理画面、そしてサイトを含む全てはオープンソースなので、誰でも中身を見ることが出来ます。</p>
            </div>
        </div>
        <a href="https://github.com/omuapps" target="_blank" rel="noopener noreferrer">
            <Tooltip>
                <p>GitHubで開発を見る</p>
            </Tooltip>
            <i class="ti ti-brand-github" />
            Github
            <i class="ti ti-arrow-right" />
        </a>
    </div>
</main>
<Content>
    <Footer />
</Content>

<style lang="scss">
    :global(body) {
        overflow-x: hidden;
    }

    .background {
        position: fixed;
        inset: 0;
        z-index: -1;
        opacity: 0.01;
    }

    .content-width {
        width: min(100%, 80rem);
    }

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
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;

            > img {
                display: block;
                width: 100%;
                flex: 1;
                object-fit: cover;
                border-radius: 0.5rem;
                box-shadow: 0.25rem 0.5rem 1rem var(--color-outline);
            }
        }
    }


    header {
        position: relative;
        display: block;
        height: 14rem;
        margin-bottom: 8rem;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 0 2rem;
        padding-left: 4rem;

        > .left {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 1rem;

            > img {
                display: block;
                height: 5rem;
            }
    
            > .info {
                width: fit-content;
                font-weight: 700;
                padding: 0.5rem 1rem;
                margin-bottom: 1rem;
                font-size: 1rem;
                color: var(--color-1);
                background: var(--color-bg-2);
            }

            > .in-dev {
                position: absolute;
                object-fit: contain;
                width: 12rem;
                right: 0;
                bottom: -1rem;
            }

            .download {
                position: absolute;
                bottom: -6rem;
                display: flex;
                flex-direction: column;

                > small {
                    color: var(--color-1);
                    margin-bottom: 0.5rem;
                }
                
                > a {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--color-1);
                    font-size: 0.8rem;
                    text-decoration: none;
                    color: var(--color-bg-1);
                    width: fit-content;
                    border-radius: 3px;

                    > i {
                        font-size: 1.25rem;
                    }

                    > p {
                        margin-left: 0.5rem;
                    }

                    &:hover {
                        background: var(--color-bg-2);
                        color: var(--color-1);
                        outline: 0.125rem solid var(--color-1);
                        outline-offset: -0.125rem;
                    }
                }
            }
        }
    }

    hr {
        width: 100%;
        height: 2px;
        border: none;
        background: var(--color-bg-2);
        margin-bottom: 6rem;
    }

    main {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        padding: 2rem;
        margin-top: 10vh;
        margin-bottom: 10vh;
    }


    .card-container {
        position: relative;
        display: flex;
        justify-content: space-between;
        gap: 7rem;
        margin-bottom: 10rem;

        > .left {
            display: flex;
            flex-direction: column;
            gap: 2rem;

            .information {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 2rem;
                padding: 1rem 0;
                border-bottom: 3px solid var(--color-1);
                margin-bottom: 2rem;
                width: 30rem;

                > .info {
                    display: flex;
                    flex-direction: column;

                    > h3 {
                        color: var(--color-1);
                        font-size: 2rem;
                        white-space: nowrap;
                    }

                    > p {
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: var(--color-text);
                    }
                }
            }
        }

        > .right {
            position: relative;
            width: 50%;

            > .dashboard {
                position: absolute;
                display: block;
                left: 0;
                bottom: 0;
                filter: drop-shadow(0.25rem 0.5rem 1rem var(--color-outline));
            }
        }
    }
</style>
