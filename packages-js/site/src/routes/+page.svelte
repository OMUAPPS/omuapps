<script lang="ts">
    import Content from '$lib/components/Content.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import Header from '$lib/components/Header.svelte';
    import dashboard1 from '$lib/images/dashboard-1.png';
    import indev from '$lib/images/in-dev.png';
    import title from '$lib/images/title.svg';
    import { Tooltip } from '@omujs/ui';
    import IndexFeatures from './_components/IndexFeatures.svelte';
    import IndexLinks from './_components/IndexLinks.svelte';
    import IndexOpenSource from './_components/IndexOpenSource.svelte';
</script>

<svelte:head>
    <title>OMUAPPS - 配信者と視聴者をつなぐAPI</title>
    <meta name="description" content="配信者と視聴者をつなぐAPI" />
</svelte:head>

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
                    <i class="ti ti-download"></i>
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
                        配信向けアプリを使いやすく
                    </h3>
                    <p>
                        OMUAPPSは、ブラウザソース向けに作りながら、より快適に使えるようにするためのAPIを提供します。
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
    <div class="content-width">
        <IndexOpenSource />
    </div>
</main>
<Content>
    <Footer />
</Content>

<style lang="scss">
    :global(body) {
        overflow-x: hidden;
    }

    .content-width {
        width: min(100%, 80rem);
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
                width: 30rem;
                margin-bottom: 1rem;

                > .info {
                    display: flex;
                    flex-direction: column;

                    > h3 {
                        color: var(--color-1);
                        font-size: 2rem;
                        white-space: nowrap;
                        border-bottom: 3px solid var(--color-1);
                        margin-bottom: 0.5rem;
                        padding: 0.5rem 0;
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
