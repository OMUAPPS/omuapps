<script lang="ts">
    import Content from '$lib/components/Content.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import Header from '$lib/components/Header.svelte';
    import dashboard1 from '$lib/images/dashboard-1.png';
    import indev from '$lib/images/in-dev.png';
    import title from '$lib/images/title.svg';
    import { Tooltip } from '@omujs/ui';
</script>

<svelte:head>
    <title>OMUAPPS</title>
    <meta name="description" content="配信者と視聴者をつなぐAPI" />
</svelte:head>

<Header />
<main>
    <header class="content-width">
        <div class="left">
            <img src={title} class="title" alt="title" />
            <p class="info">OMUAPPSは、配信者と視聴者をつなぐAPIです。</p>
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
            <a class="card" href="https://github.com/omuapps">
                <Tooltip>
                    <p>OMUAPPSのソースコード</p>
                </Tooltip>
                <i class="ti ti-brand-github" />
                <p>オープンソース</p>
                <i class="ti ti-external-link" />
            </a>
            <a class="card" href="https://discord.gg/MZKvbPpsuK">
                <Tooltip>
                    <p>OMUAPPSのDiscordコミュニティ</p>
                </Tooltip>
                <i class="ti ti-brand-discord" />
                <p>コミュニティ</p>
                <i class="ti ti-external-link" />
            </a>
            <a class="card" href="https://x.com/omuapps">
                <Tooltip>
                    <p>OMUAPPSの情報発信</p>
                </Tooltip>
                <i class="ti ti-brand-x" />
                <p>情報発信</p>
                <i class="ti ti-external-link" />
            </a>
        </div>
    </header>
    <hr>
    <div class="content-width card-container">
        <div class="left">
            <div class="information">
                <div class="info">
                    <h3>ブラウザ上のアプリを使いやすく</h3>
                    <p>
                        ブラウザだけでは作れないアプリがたくさんあります。
                        OMUAPPSは、ブラウザ向けに作りながら、より多くの機能を使えるようにするためのAPIを提供します。
                    </p>
                </div>
            </div>
            <div class="card">
                <i class="ti ti-click" />
                <div class="info">
                    <h3>かんたんに導入</h3>
                    <p>アプリの管理は一つのウィンドウの中で完結し、必要に応じて分けることも出来ます。</p>
                </div>
            </div>
            <div class="card">
                <i class="ti ti-lock" />
                <div class="info">
                    <h3>安全な権限管理</h3>
                    <p>アプリは権限がなければデータを保存することすら出来ません。</p>
                </div>
            </div>
            <div class="card">
                <i class="ti ti-package" />
                <div class="info">
                    <h3>使いやすさ</h3>
                    <p>アプリの管理は一つのウィンドウの中で完結し、必要に応じて分けることも出来ます。</p>
                </div>
            </div>
        </div>
        <div class="right">
            <img src={dashboard1} class="dashboard" alt="dashboard" />
        </div>
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
                padding: 0.5rem;
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

        > .right {
            > .card {
                width: fit-content;
                display: flex;
                flex-direction: row;
                align-items: center;
                padding: 0.75rem 1rem;
                background: var(--color-bg-2);
                margin-bottom: 0.5rem;
                font-size: 0.8rem;
                text-decoration: none;

                > i {
                    font-size: 1.25rem;
                    color: var(--color-1);
                }

                > p {
                    margin-left: 0.5rem;
                }

                .ti-external-link {
                    font-size: 0.75rem;
                    color: var(--color-1);
                    margin-left: 0.25rem;
                }

                &:hover {
                    outline: 0.125rem solid var(--color-1);
                    outline-offset: -0.125rem;
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
            
            .card {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 2rem;
                padding: 1.5rem 2.5rem;
                height: 8rem;
                background: var(--color-bg-2);
                border: 1px solid var(--color-1);
                outline: 0.25rem solid var(--color-bg-2);

                > i {
                    font-size: 2rem;
                    color: var(--color-1);
                }

                > .info {
                    display: flex;
                    flex-direction: column;

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
