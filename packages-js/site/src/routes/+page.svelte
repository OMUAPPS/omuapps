<script lang="ts">
    import Content from '$lib/components/Content.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import Header from '$lib/components/Header.svelte';
    import dashboard from '$lib/images/dashboard.png';
    import title from '$lib/images/title.svg';
    import IndexAbout from './_components/IndexAbout.svelte';
    import IndexFeatures from './_components/IndexFeatures.svelte';
    import IndexLinks from './_components/IndexLinks.svelte';
    import IndexOpenSource from './_components/IndexOpenSource.svelte';
    import IndexQA from './_components/IndexQA.svelte';
</script>

<svelte:head>
    <title>OMUAPPS - 配信者と視聴者をつなぐAPI</title>
    <meta name="description" content="配信者と視聴者をつなぐAPI" />
</svelte:head>

<Header />
<main>
    <Content>
        <div class="title">
            <img src={title} alt="title">
            <small>配信者と視聴者をつなぐAPI・アプリ管理ツール</small>
            <a class="download" href="/download">
                ダウンロード
                <i class="ti ti-chevron-right"></i>
            </a>
        </div>
        <img class="dashboard" src={dashboard} alt="">
        <IndexAbout />
        <IndexFeatures />
        <IndexQA />
        <IndexOpenSource />
        <IndexLinks />
    </Content>
</main>
<Content>
    <Footer />
</Content>

<style lang="scss">
    :global(body) {
        overflow-x: hidden !important;
    }

    main {
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .title {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 14rem 0;

        > img {
            width: min(20rem, 100%);
        }

        > .download {
            margin-top: 1rem;
            background: var(--color-1);
            color: var(--color-bg-2);
            padding: 0.75rem 1.5rem;
            border-radius: 3px;
            text-decoration: none;
        }

    }

    .dashboard {
        position: absolute;
        top: 10%;
        height: fit-content;
        margin-left: max(40rem, 0%);
        object-fit: cover;
        filter: drop-shadow(-2px 4px 10px var(--color-outline));
        overflow-x: hidden;
    }

    @container (width < 400px) {
        .title {
            margin-bottom: 4rem;
        }

        .title > img {
            width: min(20rem, 86.21%);
        }

        .title > small {
            background: var(--color-bg-2);
            color: var(--color-1);
            padding: 0.5em 1em;
        }

        .dashboard {
            position: relative;
            margin-left: 0;
            width: 200%;
            margin-bottom: 4rem;
        }
    }
</style>
